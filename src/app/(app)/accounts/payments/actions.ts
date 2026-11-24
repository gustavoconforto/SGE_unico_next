"use server";

import { and, asc, eq, ilike, inArray, or } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  accountsPayment as payment,
  accountsSupplier as supplier,
  studentsGuardian as guardian,
} from "@/db/schema/app";
import {
  PAYMENT_METHODS,
  PENDING_STATUSES,
  formatMoney,
  installmentBalance,
  money,
  principal,
  toDb,
} from "@/lib/finance";
import { lockInstallment, outstandingSql, refreshInstallmentStatus } from "@/lib/finance-db";
import {
  type FormErrors,
  type FormState,
  INVALID_CHOICE,
  REQUIRED,
  decimalField,
  foreignKey,
  formIds,
  parseForm,
  requiredDate,
} from "@/lib/form";
import { foldSql, likePattern, stripAccents } from "@/lib/list";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { type InstallmentChoice, toChoice } from "./data";

const paymentSchema = z.object({
  installmentId: foreignKey,
  paidAt: requiredDate,
  amount: decimalField({ min: 0.01, minMessage: "Informe um valor maior que zero." }),
  // Blank adjustments mean none: the form keeps them collapsed
  penalty: decimalField({ min: 0, optional: true }),
  interest: decimalField({ min: 0, optional: true }),
  monetaryAdjust: decimalField({ min: 0, optional: true }),
  discount: decimalField({ min: 0, optional: true }),
  method: z.enum(PAYMENT_METHODS.map(([c]) => c) as [string, ...string[]], { error: REQUIRED }),
  notes: z.string().trim().max(200).default(""),
});

/** The installment search box: pending installments of one direction (ReceivableInstallmentLookupView). */
export async function searchInstallments(direction: "R" | "P", q: string): Promise<InstallmentChoice[]> {
  await requirePermission("payments", "edit");
  // Searching every pending installment is reading the book: edit-only staff pay the installment they came with
  if (!(await hasPermission("payments", "view"))) return [];
  const p = likePattern(stripAccents(q.trim()));
  const rows = await db
    .select({
      id: installment.id,
      number: installment.number,
      dueDate: installment.dueDate,
      amount: installment.amount,
      description: account.description,
      balance: outstandingSql,
      guardian: guardian.name,
      supplier: supplier.name,
    })
    .from(installment)
    .innerJoin(account, eq(installment.accountId, account.id))
    .leftJoin(guardian, eq(account.guardianId, guardian.id))
    .leftJoin(supplier, eq(account.supplierId, supplier.id))
    .where(
      and(
        eq(account.direction, direction),
        inArray(installment.status, PENDING_STATUSES),
        q.trim()
          ? direction === "R"
            ? orIlike([account.description, guardian.name], p)
            : orIlike([account.description, supplier.name, supplier.document], p)
          : undefined,
      ),
    )
    .orderBy(asc(installment.dueDate), asc(installment.id))
    .limit(10);
  return rows.map(toChoice);
}

/** "agatha" finds "Ágatha": both sides lose their accents. */
function orIlike(columns: AnyPgColumn[], pattern: string) {
  return or(...columns.map((c) => ilike(foldSql(c), pattern)));
}

/**
 * PaymentForm + PaymentSaveMixin: the principal (amount − charges + discount) must be positive and fit the
 * installment's balance, checked again with the installment row locked so a double submit can't pass twice.
 */
export async function savePayment(
  id: number | null,
  direction: "R" | "P",
  returnTo: "account" | "enrollment" | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("payments", "edit");
  // Without the book (payments.view) only new payments of enrollment installments: the desk at signing
  const book = await hasPermission("payments", "view");
  if (id && !book) redirect("/forbidden");
  const { data, values, state } = parseForm(paymentSchema, formData);
  if (!data) return state;
  const fields = {
    ...data,
    discount: data.discount ?? "0.00",
    penalty: data.penalty ?? "0.00",
    interest: data.interest ?? "0.00",
    monetaryAdjust: data.monetaryAdjust ?? "0.00",
  };
  if (principal(fields).lte(0))
    return {
      errors: { amount: ["O valor pago mais o desconto deve ser maior que a soma de multa, juros e correção."] },
      values,
    };
  // A new payment split across methods: the main fields are the first method, each other method is one more row
  const split = id ? null : splitParts(formData, fields);
  if (split && "errors" in split) return { errors: split.errors, values };
  const rows = split?.rows ?? [fields];
  const paid = rows.reduce((sum, r) => sum.plus(principal(r)), money(0));

  if (id && !(await db.select({ id: payment.id }).from(payment).where(eq(payment.id, id))).length)
    redirect("/accounts/payments");

  const result = await db.transaction(async (tx) => {
    const target = await lockInstallment(tx, data.installmentId);
    // Read under the lock, not before it: an edit of this payment committed meanwhile changed what goes back into the balance
    const [previous] = id ? await tx.select().from(payment).where(eq(payment.id, id)).for("update") : [];
    if (id && !previous)
      return { errors: { installmentId: ["Este pagamento acabou de ser excluído por outra pessoa."] } };
    const [acc] = target
      ? await tx
          .select({ direction: account.direction, enrollmentId: account.enrollmentId })
          .from(account)
          .where(eq(account.id, target.accountId))
      : [];
    // Only installments of this direction that still accept payments, plus the current one on edit
    const sameAsBefore = previous?.installmentId === data.installmentId;
    if (
      !target ||
      acc?.direction !== direction ||
      (!book && !acc.enrollmentId) ||
      (!PENDING_STATUSES.includes(target.status) && !sameAsBefore)
    )
      return { errors: { installmentId: [INVALID_CHOICE] } };

    let balance = installmentBalance(target.amount, target.status, money(target.paid));
    // The payment being edited is already in the balance
    if (sameAsBefore) balance = balance.plus(principal(previous));
    if (paid.gt(balance))
      return {
        errors: {
          amount: [
            `Esta baixa quitaria R$ ${formatMoney(paid)} da parcela, mas o saldo é R$ ${formatMoney(balance)}. Reduza o valor ou informe multa, juros ou correção.`,
          ],
        },
      };

    // Moving the payment changes the old installment's balance too
    // shortcut: two edits moving payments between the same two installments in opposite directions deadlock; Postgres aborts one and the user resubmits
    if (previous && !sameAsBefore) await lockInstallment(tx, previous.installmentId);
    if (id) await tx.update(payment).set(fields).where(eq(payment.id, id));
    else await tx.insert(payment).values(rows);
    await refreshInstallmentStatus(tx, data.installmentId);
    if (previous && !sameAsBefore) await refreshInstallmentStatus(tx, previous.installmentId);
    return { accountId: target.accountId, enrollmentId: acc.enrollmentId };
  });
  if ("errors" in result) return { errors: result.errors, values };

  const msg = id ? "payment_updated" : "payment_created";
  // "Baixar" came from an enrollment or account page: go back there to print the receipt
  if (returnTo === "enrollment" && result.enrollmentId) redirect(`/enrollments/${result.enrollmentId}/edit?msg=${msg}`);
  if (returnTo)
    redirect(`/accounts/${direction === "R" ? "receivable" : "payable"}/${result.accountId}/edit?msg=${msg}`);
  redirect(`/accounts/payments${direction === "P" ? "?direction=P&" : "?"}msg=${msg}`);
}

type PaymentFields = z.infer<typeof paymentSchema> & {
  penalty: string;
  interest: string;
  monetaryAdjust: string;
  discount: string;
};
const splitAmount = decimalField({ min: 0.01, minMessage: "Informe um valor maior que zero." });

/**
 * The other methods of a split payment (`split` = row keys, `splitMethod_<k>` / `splitAmount_<k>`). Not in Django:
 * the guardian pays part in cash, part by PIX. Each method is its own payment; charges and discount stay on the
 * first (the main fields), so the total principal is the same as one payment of the sum.
 */
function splitParts(formData: FormData, fields: PaymentFields) {
  const errors: FormErrors = {};
  const parts = formIds(formData, "split").map((k) => {
    const method = paymentSchema.shape.method.safeParse(formData.get(`splitMethod_${k}`) ?? "");
    const amount = splitAmount.safeParse(formData.get(`splitAmount_${k}`) ?? "");
    if (!method.success) errors[`splitMethod_${k}`] = [REQUIRED];
    if (!amount.success) errors[`splitAmount_${k}`] = [amount.error.issues[0].message];
    return { method: method.data ?? "", amount: amount.data ?? "0" };
  });
  if (Object.keys(errors).length) return { errors };
  const zero = { penalty: "0.00", interest: "0.00", monetaryAdjust: "0.00", discount: "0.00" };
  return { rows: [fields, ...parts.map((p) => ({ ...fields, ...zero, ...p }))] };
}

const batchSchema = paymentSchema.pick({ paidAt: true, method: true, notes: true });
const charge = decimalField({ min: 0, optional: true });
const ROW_FIELDS = ["penalty", "interest", "discount"] as const;

/**
 * Several installments of one receivable account paid at once (no Django equivalent): one payment per installment,
 * each settling its whole balance plus that row's multa/juros, minus its desconto. All or nothing.
 * `balance_<id>` is the balance the screen showed, so a payment saved meanwhile can't change what the guardian pays.
 */
export async function saveBatchPayment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("payments", "edit");
  const book = await hasPermission("payments", "view");
  const { data, values, state } = parseForm(batchSchema, formData);
  // Ascending, so two batches over the same installments lock them in the same order and can't deadlock
  const ids = formIds(formData, "installment").sort((a, b) => a - b);
  if (!ids.length) return { formError: "Selecione ao menos uma parcela.", values };
  const errors: FormErrors = { ...state?.errors };
  const rows = ids.map((id) => {
    const row = { id, shown: values[`balance_${id}`] ?? "", penalty: "0.00", interest: "0.00", discount: "0.00" };
    for (const k of ROW_FIELDS) {
      const parsed = charge.safeParse(values[`${k}_${id}`] ?? "");
      if (parsed.success) row[k] = parsed.data ?? "0.00";
      else errors[`${k}_${id}`] = [parsed.error.issues[0].message];
    }
    return row;
  });
  if (!data || Object.keys(errors).length) return { errors, values };

  const result = await db.transaction(async (tx) => {
    // Check every installment before inserting anything: an early return commits what was already written
    const checked = [];
    let target: { accountId: number; enrollmentId: number | null } | undefined;
    for (const row of rows) {
      const locked = await lockInstallment(tx, row.id);
      const [acc] = locked
        ? await tx
            .select({ direction: account.direction, enrollmentId: account.enrollmentId })
            .from(account)
            .where(eq(account.id, locked.accountId))
        : [];
      if (
        !locked ||
        acc?.direction !== "R" ||
        (!book && !acc.enrollmentId) ||
        !PENDING_STATUSES.includes(locked.status) ||
        (target && target.accountId !== locked.accountId)
      )
        return {
          formError:
            "Uma das parcelas não aceita mais baixa (já quitada ou cancelada). Volte à matrícula e selecione de novo.",
        };
      target = { accountId: locked.accountId, enrollmentId: acc.enrollmentId };
      const balance = installmentBalance(locked.amount, locked.status, money(locked.paid));
      if (!/^\d+(\.\d+)?$/.test(row.shown) || !balance.eq(money(row.shown)))
        return {
          formError:
            "Uma das parcelas recebeu outra baixa enquanto esta tela estava aberta. Volte à matrícula e selecione de novo.",
        };
      const amount = balance.plus(money(row.penalty)).plus(money(row.interest)).minus(money(row.discount));
      if (amount.lte(0))
        return { errors: { [`discount_${row.id}`]: ["O desconto deve ser menor que o saldo mais multa e juros."] } };
      checked.push({ ...row, amount: toDb(amount) });
    }
    for (const row of checked) {
      await tx.insert(payment).values({
        installmentId: row.id,
        paidAt: data.paidAt,
        method: data.method,
        notes: data.notes,
        amount: row.amount,
        penalty: row.penalty,
        interest: row.interest,
        monetaryAdjust: "0.00",
        discount: row.discount,
      });
      await refreshInstallmentStatus(tx, row.id);
    }
    return target!;
  });
  if ("formError" in result || "errors" in result) return { ...result, values };

  redirect(
    result.enrollmentId
      ? `/enrollments/${result.enrollmentId}/edit?msg=payments_created`
      : `/accounts/receivable/${result.accountId}/edit?msg=payments_created`,
  );
}

export async function deletePayment(id: number) {
  await requirePermission("payments", "edit");
  await requirePermission("payments", "view"); // deleting starts from the book's list
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ installmentId: payment.installmentId }).from(payment).where(eq(payment.id, id));
    if (!row) return;
    // Like savePayment: a payment saved or deleted at the same moment would leave a stale status
    await lockInstallment(tx, row.installmentId);
    await tx.delete(payment).where(eq(payment.id, id));
    await refreshInstallmentStatus(tx, row.installmentId);
  });
  redirect("/accounts/payments?msg=payment_deleted");
}
