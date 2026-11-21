"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accountsAccount as account, accountsAccounttype as accountType, accountsInstallment as installment, accountsPayment as payment, studentsStudent as student } from "@/db/schema/app";
import { FOREIGN_KEY_VIOLATION, pgConstraint, pgErrorCode } from "@/lib/db-error";
import { accountInstallments, initialStatus, money, toDb } from "@/lib/finance";
import { financialGuardians } from "@/lib/finance-db";
import { type FormErrors, type FormState, INVALID_CHOICE, decimalField, foreignKey, intField, optionalForeignKey, parseForm, requiredDate, requiredText } from "@/lib/form";
import { KINDS, type Kind } from "../kinds";
import { requireSession } from "@/lib/session";

const baseSchema = z.object({
  description: requiredText(200),
  categoryId: foreignKey,
  issueDate: requiredDate,
  notes: z.string().default(""),
  studentId: optionalForeignKey,
  guardianId: optionalForeignKey,
  supplierId: optionalForeignKey,
});
// Values are split into installments on creation, so they are locked afterwards
const createSchema = baseSchema.extend({
  grossValue: decimalField({ min: 0 }),
  discountValue: decimalField({ min: 0, optional: true }),
  installmentsCount: intField(1, 120),
  firstDueDate: requiredDate,
});

/** A choice deleted while the form was open: the field whose foreign key failed, or a form error. */
function deletedChoice(error: unknown, values: Record<string, string>): FormState {
  if (pgErrorCode(error) !== FOREIGN_KEY_VIOLATION) throw error;
  // Django's constraint names: accounts_account_<field>_id_<hash>_fk_...
  const field = ["category", "student", "guardian", "supplier"].find((f) => pgConstraint(error).startsWith(`accounts_account_${f}_id_`));
  return field ? { errors: { [`${field}Id`]: [INVALID_CHOICE] }, values } : { formError: INVALID_CHOICE, values };
}

/** AccountForm.clean() + AccountReceivableForm.clean(): category of this direction, payer rules. */
async function counterpartErrors(kind: Kind, data: z.infer<typeof baseSchema>, studentLocked: boolean) {
  const errors: FormErrors = {};
  const [category] = await db.select({ direction: accountType.direction }).from(accountType).where(eq(accountType.id, data.categoryId));
  if (category?.direction !== KINDS[kind].direction) errors.categoryId = [INVALID_CHOICE];
  const fields: { studentId: number | null; guardianId: number | null; supplierId: number | null } = { studentId: null, guardianId: null, supplierId: null };
  if (kind === "payable") {
    fields.supplierId = data.supplierId;
    return { errors, fields };
  }
  fields.studentId = data.studentId;
  fields.guardianId = data.guardianId;
  if (data.studentId) {
    const [[s], guardians] = await Promise.all([
      db.select({ selfFinancial: student.isSelfFinancial }).from(student).where(eq(student.id, data.studentId)),
      financialGuardians(db, data.studentId),
    ]);
    if (!s && !studentLocked) errors.studentId = [INVALID_CHOICE];
    // Only the student's financial guardians; none chosen → the first one (or the student pays)
    if (data.guardianId && !guardians.some((g) => g.id === data.guardianId)) errors.guardianId = [INVALID_CHOICE];
    if (!data.guardianId) {
      if (!guardians.length && !s?.selfFinancial) errors.studentId = ["O aluno não possui responsável financeiro cadastrado."];
      fields.guardianId = guardians[0]?.id ?? null;
    }
  }
  return { errors, fields };
}

export async function createAccount(kind: Kind, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(createSchema, formData);
  if (!data) return state;
  const discount = money(data.discountValue ?? "0");
  const { errors, fields } = await counterpartErrors(kind, data, false);
  if (discount.gt(money(data.grossValue))) errors.discountValue = ["O desconto não pode exceder o valor bruto."];
  if (Object.keys(errors).length) return { errors, values };

  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [{ id }] = await tx
        .insert(account)
        .values({
          direction: KINDS[kind].direction,
          description: data.description,
          categoryId: data.categoryId,
          issueDate: data.issueDate,
          grossValue: data.grossValue,
          discountValue: toDb(discount),
          notes: data.notes,
          ...fields,
        })
        .returning({ id: account.id });
      const net = money(data.grossValue).minus(discount);
      await tx
        .insert(installment)
        .values(accountInstallments(net, data.installmentsCount, data.firstDueDate).map((i) => ({ accountId: id, number: i.number, dueDate: i.dueDate, amount: toDb(i.amount), status: initialStatus(i.amount) })));
      return id;
    });
  } catch (error) {
    return deletedChoice(error, values);
  }
  // Straight to the new account, where installments are paid and printed
  redirect(`/accounts/${kind}/${id}/edit?msg=created`);
}

export async function updateAccount(kind: Kind, id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const [current] = await db
    .select()
    .from(account)
    .where(and(eq(account.id, id), eq(account.direction, KINDS[kind].direction)));
  if (!current) redirect(`/accounts/${kind}`);
  const { data, values, state } = parseForm(baseSchema, formData);
  if (!data) return state;
  // The contract account belongs to its enrollment's student
  const studentLocked = !!current.enrollmentId;
  if (studentLocked) data.studentId = current.studentId;
  const { errors, fields } = await counterpartErrors(kind, data, studentLocked);
  if (Object.keys(errors).length) return { errors, values };
  try {
    await db
      .update(account)
      .set({ description: data.description, categoryId: data.categoryId, issueDate: data.issueDate, notes: data.notes, ...fields })
      .where(eq(account.id, id));
  } catch (error) {
    return deletedChoice(error, values);
  }
  redirect(`/accounts/${kind}?msg=updated`);
}

/** An account with payments can't be deleted; without them its installments go with it. */
export async function deleteAccount(kind: Kind, id: number) {
  await requireSession();
  // Its installments go first, so check the account is of this kind before touching them
  const [acc] = await db.select({ id: account.id }).from(account).where(and(eq(account.id, id), eq(account.direction, KINDS[kind].direction)));
  if (!acc) redirect(`/accounts/${kind}`);
  const [paid] = await db.select({ id: payment.id }).from(payment).innerJoin(installment, eq(payment.installmentId, installment.id)).where(eq(installment.accountId, id)).limit(1);
  if (paid) redirect(`/accounts/${kind}?msg=account_has_payments`);
  try {
    await db.transaction(async (tx) => {
      await tx.delete(installment).where(eq(installment.accountId, id));
      await tx.delete(account).where(eq(account.id, id));
    });
  } catch (error) {
    if (pgErrorCode(error) !== FOREIGN_KEY_VIOLATION) throw error;
    redirect(`/accounts/${kind}?msg=account_in_use`);
  }
  redirect(`/accounts/${kind}?msg=deleted`);
}
