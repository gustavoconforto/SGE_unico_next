"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, enrollmentsEnrollmenttype as enrollmentType, releasesEarlyexit as t } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { INVALID_CHOICE, type FormState, anotherUrl, foreignKey, formIds, formValues, parseForm, requiredDate } from "@/lib/form";
import { enrollmentAllowed } from "@/app/(app)/enrollments/data";
import { INVALID_ENROLLMENT } from "@/app/(app)/incidents/records";
import { requireSession } from "@/lib/session";

const schema = z.object({ enrollmentId: foreignKey, exitDate: requiredDate, reasonId: foreignKey });
const DUPLICATE = "Este aluno já tem uma liberação com este motivo nesta data.";

export async function saveExit(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const [current] = id ? await db.select({ enrollmentId: t.enrollmentId }).from(t).where(eq(t.id, id)) : [];
  // Only active enrollments, or the one the record already has
  if (!(await enrollmentAllowed(data.enrollmentId, current?.enrollmentId))) return { errors: INVALID_ENROLLMENT, values };
  let newId: number | null = null;
  try {
    if (id === null) [{ id: newId }] = await db.insert(t).values(data).returning({ id: t.id });
    else await db.update(t).set(data).where(eq(t.id, id));
  } catch (error) {
    const code = pgErrorCode(error);
    if (code === UNIQUE_VIOLATION) return { formError: DUPLICATE, values };
    if (code === FOREIGN_KEY_VIOLATION) return { errors: { reasonId: [INVALID_CHOICE] }, values }; // motive deleted meanwhile
    throw error;
  }
  if (newId !== null) {
    const next = anotherUrl("/releases/new", formData, ["reasonId", "exitDate"], newId);
    if (next) redirect(next);
  }
  redirect(`/releases?msg=${id === null ? "created" : "updated"}`);
}

const batchSchema = z.object({ exitDate: requiredDate, schoolYearId: foreignKey, reasonId: foreignKey });

/** One exit per checked student; ones already recorded (same student, date and motive) are skipped. */
export async function saveBatchExits(_prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  // The three come from hidden fields set by the page, so a failure here is a stale or tampered form
  const { data } = parseForm(batchSchema, formData);
  if (!data) return { formError: "Escolha a data, o ano letivo e o motivo novamente." };
  const ids = formIds(formData, "enrollmentId");
  const values = formValues(formData);
  if (!ids.length) return { formError: "Selecione ao menos um aluno.", values };
  const allowed = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .where(and(inArray(enrollment.id, ids), eq(enrollment.status, "A"), eq(enrollmentType.schoolYearId, data.schoolYearId)));
  if (allowed.length !== ids.length) return { formError: "Algum aluno selecionado não tem mais matrícula ativa neste ano letivo. Recarregue a página.", values };
  try {
    await db
      .insert(t)
      .values(ids.map((enrollmentId) => ({ enrollmentId, exitDate: data.exitDate, reasonId: data.reasonId })))
      .onConflictDoNothing();
  } catch (error) {
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { formError: "Este motivo foi excluído. Escolha outro.", values };
    throw error;
  }
  redirect(`/releases?date_from=${data.exitDate}&date_to=${data.exitDate}&msg=releases_created`);
}

export async function deleteExit(id: number) {
  await requireSession();
  await deleteAndRedirect(() => db.delete(t).where(eq(t.id, id)), "/releases");
}
