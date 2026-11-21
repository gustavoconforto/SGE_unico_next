"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsDiscounttype as discountType,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmentdiscount as enrollmentDiscount,
  enrollmentsEnrollmentneededdocument as enrollmentDocument,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  programsProgram as program,
  studentsStudent as student,
} from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { ENDED_EARLY, ENROLLMENT_STATUSES, contractValues, enrollmentInstallments, label, lopsidedInstallment, money, today } from "@/lib/finance";
import { type Tx, cancelFutureInstallments, createEnrollmentAccount, financialGuardians, hasOverdueDebt, syncDocuments } from "@/lib/finance-db";
import { type FormErrors, type FormState, REQUIRED, decimalField, foreignKey, formIds, formValues, intField, optionalForeignKey } from "@/lib/form";
import { enrollmentTypeLabel, studentName } from "./data";
import { requireSession } from "@/lib/session";

const statusField = z.enum(ENROLLMENT_STATUSES.map(([code]) => code) as [string, ...string[]], { error: REQUIRED });

/** Enrollment.clean(): the rules that need the database. Returns field errors (empty when valid). */
async function enrollmentErrors(conn: typeof db | Tx, e: { studentId: number; enrollmentTypeId: number; schoolClassId: number | null; enrolledAt: string; adding: boolean }) {
  const errors: FormErrors = {};
  const [[s], [type]] = await Promise.all([
    conn.select({ selfFinancial: student.isSelfFinancial }).from(student).where(eq(student.id, e.studentId)),
    conn
      .select({ schoolYearId: enrollmentType.schoolYearId, programId: enrollmentType.programId, level: enrollmentType.level, begins: year.begins })
      .from(enrollmentType)
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(eq(enrollmentType.id, e.enrollmentTypeId)),
  ]);
  if (!s) errors.studentId = ["Selecione uma opção válida."];
  else if (!s.selfFinancial && (await financialGuardians(conn, e.studentId).limit(1)).length === 0)
    errors.studentId = ["O aluno precisa ter ao menos um responsável financeiro cadastrado ou ser marcado como o próprio responsável financeiro."];
  else if (e.adding && (await hasOverdueDebt(conn, e.studentId)))
    errors.studentId = ["O aluno possui parcelas vencidas em matrícula anterior. Regularize os débitos antes de realizar uma nova matrícula."];
  if (!type) {
    errors.enrollmentTypeId = ["Selecione uma opção válida."];
    return errors;
  }
  // Its installments would all fall in a year that has already passed
  if (Number(e.enrolledAt.slice(0, 4)) > Number(type.begins.slice(0, 4))) errors.enrollmentTypeId = ["Este tipo de contrato é de um ano letivo encerrado."];
  if (e.schoolClassId) {
    const [c] = await conn.select({ yearId: klass.yearId, programId: klass.programId, gradeLevel: klass.gradeLevel }).from(klass).where(eq(klass.id, e.schoolClassId));
    if (!c) errors.schoolClassId = ["Selecione uma opção válida."];
    else if (c.yearId !== type.schoolYearId) errors.schoolClassId = ["A turma pertence a outro ano letivo."];
    else if (c.programId !== type.programId) errors.schoolClassId = ["A turma pertence a outro curso."];
    else if (type.level && c.gradeLevel !== Number(type.level)) errors.schoolClassId = ["A turma pertence a outra série."];
  }
  return errors;
}

const GROUPS = [
  ["F", "first"],
  ["R", "remaining"],
] as const;

const createSchema = z.object({
  studentId: foreignKey,
  enrollmentTypeId: foreignKey,
  schoolClassId: optionalForeignKey,
  status: statusField,
  dueDay: intField(1, 28),
  firstCustomPercent: decimalField({ maxDigits: 5, min: 0.01, max: 100, optional: true }),
  firstCustomObservation: z.string().trim().max(200).default(""),
  remainingCustomPercent: decimalField({ maxDigits: 5, min: 0.01, max: 100, optional: true }),
  remainingCustomObservation: z.string().trim().max(200).default(""),
});

export async function createEnrollment(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  const selectedTypes = Object.fromEntries(GROUPS.map(([, prefix]) => [prefix, formIds(formData, `${prefix}DiscountTypes`)])) as Record<
    "first" | "remaining",
    number[]
  >;
  // Multi-value checkboxes don't fit formValues(); echo them back as CSV for the form
  for (const [, prefix] of GROUPS) values[`${prefix}DiscountTypes`] = selectedTypes[prefix].join(",");

  const parsed = createSchema.safeParse(values);
  const errors: FormErrors = parsed.success ? {} : (z.flattenError(parsed.error).fieldErrors as FormErrors);

  // EnrollmentCreateForm.clean(): each group's discounts (types + a custom one with its reason) up to 100%
  const types = await db
    .select()
    .from(discountType)
    .where(inArray(discountType.id, [...selectedTypes.first, ...selectedTypes.remaining, 0]));
  const discounts: { group: string; discountTypeId: number | null; percentage: string; observation: string }[] = [];
  for (const [group, prefix] of GROUPS) {
    // Parsed on its own, so the discount sums (and the lopsided check below) work while other fields are still invalid
    const percentField = createSchema.shape[`${prefix}CustomPercent`].safeParse(values[`${prefix}CustomPercent`]);
    const percent = percentField.success ? percentField.data : null;
    const observation = values[`${prefix}CustomObservation`]?.trim() ?? "";
    if (percent && !observation) errors[`${prefix}CustomObservation`] = ["Informe quem autorizou ou o motivo do desconto avulso."];
    else if (observation && !percent && !errors[`${prefix}CustomPercent`]) errors[`${prefix}CustomPercent`] = ["Informe o percentual do desconto avulso."];
    const groupDiscounts = [
      ...types.filter((t) => selectedTypes[prefix].includes(t.id)).map((t) => ({ group, discountTypeId: t.id, percentage: t.percentage, observation: "" })),
      ...(percent ? [{ group, discountTypeId: null, percentage: percent, observation }] : []),
    ];
    const total = groupDiscounts.reduce((sum, d) => sum.plus(money(d.percentage)), money(0));
    if (total.gt(100)) errors[`${prefix}DiscountTypes`] = [`A soma dos descontos (${total.toString()}%) não pode passar de 100%.`];
    discounts.push(...groupDiscounts);
  }

  const sum = (group: string) =>
    discounts
      .filter((d) => d.group === group)
      .reduce((s, d) => s.plus(money(d.percentage)), money(0))
      .toFixed(2);
  const enrolledAt = today();
  // The form's warning asks staff to confirm a contract piled onto few installments; hold them to it.
  // Checked with the field errors, so a submit reports everything at once instead of rejecting twice.
  const typeId = createSchema.shape.enrollmentTypeId.safeParse(values.enrollmentTypeId);
  const dueDay = createSchema.shape.dueDay.safeParse(values.dueDay);
  if (values.confirmLopsided !== "on" && typeId.success && dueDay.success && !errors.firstDiscountTypes && !errors.remainingDiscountTypes) {
    const [priced] = await db
      .select({ totalPrice: enrollmentType.totalPrice, begins: year.begins })
      .from(enrollmentType)
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(eq(enrollmentType.id, typeId.data));
    const planned = priced && contractValues(priced.totalPrice, sum("F"), sum("R"));
    if (planned && lopsidedInstallment(enrollmentInstallments(planned, enrolledAt, Number(priced.begins.slice(0, 4)), dueDay.data), planned.net))
      errors.confirmLopsided = ["Marque a confirmação depois de conferir os valores com o responsável."];
  }
  if (!parsed.success || Object.keys(errors).length) return { errors, values };

  const data = parsed.data;
  Object.assign(errors, await enrollmentErrors(db, { ...data, enrolledAt, adding: true }));
  if (Object.keys(errors).length) return { errors, values };
  let id: number;
  try {
    id = await db.transaction(async (tx) => {
      const [type] = await tx
        .select({ totalPrice: enrollmentType.totalPrice, level: enrollmentType.level, program: program.name, begins: year.begins })
        .from(enrollmentType)
        .innerJoin(program, eq(enrollmentType.programId, program.id))
        .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
        .where(eq(enrollmentType.id, data.enrollmentTypeId));
      const [s] = await tx.select({ name: studentName, selfFinancial: student.isSelfFinancial }).from(student).where(eq(student.id, data.studentId));
      const firstDiscountPercent = sum("F");
      const remainingDiscountPercent = sum("R");
      const [{ id: enrollmentId }] = await tx
        .insert(enrollment)
        .values({
          studentId: data.studentId,
          enrollmentTypeId: data.enrollmentTypeId,
          schoolClassId: data.schoolClassId,
          status: data.status,
          dueDay: data.dueDay,
          enrolledAt,
          grossValue: type.totalPrice,
          firstDiscountPercent,
          remainingDiscountPercent,
        })
        .returning({ id: enrollment.id });
      if (discounts.length) await tx.insert(enrollmentDiscount).values(discounts.map((d) => ({ ...d, enrollmentId })));
      // Django's post_save signal: the contract account, its installments and the documents checklist
      const schoolYear = Number(type.begins.slice(0, 4));
      await createEnrollmentAccount(
        tx,
        {
          id: enrollmentId,
          studentId: data.studentId,
          enrolledAt,
          dueDay: data.dueDay,
          schoolYear,
          selfFinancial: s.selfFinancial,
          description: `${s.name} - ${enrollmentTypeLabel(type.program, type.level, schoolYear)}`,
        },
        contractValues(type.totalPrice, firstDiscountPercent, remainingDiscountPercent),
      );
      await syncDocuments(tx, enrollmentId);
      return enrollmentId;
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { formError: "Matrícula com este Aluno e Tipo de contrato já existe.", values };
    throw error;
  }
  redirect(`/enrollments/${id}/edit?msg=enrollment_created`);
}

const updateSchema = z.object({ schoolClassId: optionalForeignKey, status: statusField });

/** Student, contract and due day are locked: the account and installments were generated from them. */
export async function updateEnrollment(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const values = formValues(formData);
  const parsed = updateSchema.safeParse(values);
  const [current] = await db.select().from(enrollment).where(eq(enrollment.id, id));
  if (!current) redirect("/enrollments");
  if (!parsed.success) return { errors: z.flattenError(parsed.error).fieldErrors as FormErrors, values };
  const data = parsed.data;

  const errors = await enrollmentErrors(db, {
    studentId: current.studentId,
    enrollmentTypeId: current.enrollmentTypeId,
    schoolClassId: data.schoolClassId,
    enrolledAt: current.enrolledAt,
    adding: false,
  });
  // Ending the enrollment cancelled its future installments, and nothing brings them back
  if (ENDED_EARLY.includes(current.status) && !ENDED_EARLY.includes(data.status))
    errors.status = [`A matrícula está ${label(ENROLLMENT_STATUSES, current.status).toLowerCase()} e suas parcelas futuras foram canceladas; ela não pode voltar a ficar ativa ou concluída.`];
  if (Object.keys(errors).length) return { errors, values };

  const delivered = new Set(formData.getAll("delivered").map(Number));
  await db.transaction(async (tx) => {
    await tx.update(enrollment).set(data).where(eq(enrollment.id, id));
    if (ENDED_EARLY.includes(data.status)) await cancelFutureInstallments(tx, id);
    const docs = await tx.select({ id: enrollmentDocument.id, isDelivered: enrollmentDocument.isDelivered }).from(enrollmentDocument).where(eq(enrollmentDocument.enrollmentId, id));
    for (const doc of docs) {
      const isDelivered = delivered.has(doc.id);
      if (isDelivered !== doc.isDelivered)
        await tx
          .update(enrollmentDocument)
          .set({ isDelivered })
          .where(and(eq(enrollmentDocument.id, doc.id), eq(enrollmentDocument.enrollmentId, id)));
    }
  });
  redirect("/enrollments?msg=updated");
}
