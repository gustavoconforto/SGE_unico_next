"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { gradesExamtype as examType, gradesGrade as grade } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgConstraint, pgErrorCode } from "@/lib/db-error";
import { REQUIRED, type FormState, decimalField, intField, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/access";

const examTypeSchema = z.object({
  name: requiredText(50),
  code: requiredText(5).transform((v) => v.toUpperCase()),
  kind: z.enum(["R", "B", "C", "A"], { error: REQUIRED }),
  maxScore: decimalField({ maxDigits: 4, min: 0.01, minMessage: "Informe um valor maior que zero." }),
  order: intField(0, 32767),
});

export async function saveExamType(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("academicSetup.edit");
  const { data, values, state } = parseForm(examTypeSchema, formData);
  if (!data) return state;
  // The kind decides where saved grades count (a bimester, the recovery, an adjustment): changing it would move them silently
  if (id !== null) {
    const [current] = await db.select({ kind: examType.kind }).from(examType).where(eq(examType.id, id));
    const [used] = current && current.kind !== data.kind ? await db.select({ id: grade.id }).from(grade).where(eq(grade.examTypeId, id)).limit(1) : [];
    if (used) return { errors: { kind: ["Este tipo de avaliação já tem notas lançadas, então o tipo não pode mudar."] }, values };
  }
  try {
    if (id === null) await db.insert(examType).values(data);
    else await db.update(examType).set(data).where(eq(examType.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      return pgConstraint(error).includes("code")
        ? { errors: { code: ["Tipo de avaliação com esta Sigla já existe."] }, values }
        : { errors: { name: ["Tipo de avaliação com este Nome já existe."] }, values };
    throw error;
  }
  redirect(`/grades/exam-types?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteExamType(id: number) {
  await requirePermission("academicSetup.edit");
  await deleteAndRedirect(() => db.delete(examType).where(eq(examType.id, id)), "/grades/exam-types");
}
