"use server";

import { and, eq, inArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, incidentsStudentdelay as t } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { REQUIRED, type FormState, parseForm, anotherUrl, formIds, formValues } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";
import { enrollmentAllowed } from "@/app/(app)/enrollments/data";
import { INVALID_ENROLLMENT, recordFields } from "@/app/(app)/incidents/records";

const schema = z.object({ ...recordFields, delayType: z.enum(["A", "U"], { error: REQUIRED }) });

export async function saveRecord(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("incidents", "edit");
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const [current] = id ? await db.select({ enrollmentId: t.enrollmentId }).from(t).where(eq(t.id, id)) : [];
  // Only active enrollments, or the one the record already has (ActiveEnrollmentFormMixin)
  if (!(await enrollmentAllowed(data.enrollmentId, current?.enrollmentId)))
    return { errors: INVALID_ENROLLMENT, values };
  if (id === null) {
    const [row] = await db.insert(t).values(data).returning({ id: t.id });
    const next = anotherUrl("/incidents/delays/new", formData, ["delayType", "incidentDate"], row.id);
    if (next) redirect(next);
  } else await db.update(t).set(data).where(eq(t.id, id));
  redirect(`/incidents/delays?msg=${id === null ? "created" : "updated"}`);
}

const batchSchema = schema.omit({ enrollmentId: true });

/** One delay per checked student, all with the same type and date. */
export async function saveBatchRecords(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("incidents", "edit");
  const { data, state } = parseForm(batchSchema, formData);
  if (!data) return state;
  const ids = formIds(formData, "enrollmentId");
  const values = formValues(formData);
  if (!ids.length) return { formError: "Selecione ao menos um aluno.", values };
  const active = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(and(inArray(enrollment.id, ids), eq(enrollment.status, "A")));
  if (active.length !== ids.length)
    return { formError: "Algum aluno selecionado não tem mais matrícula ativa. Recarregue a página.", values };
  await db.insert(t).values(ids.map((enrollmentId) => ({ enrollmentId, ...data })));
  redirect(`/incidents/delays?date_from=${data.incidentDate}&date_to=${data.incidentDate}&msg=delays_created`);
}

export async function deleteRecord(id: number) {
  await requirePermission("incidents", "edit");
  await deleteAndRedirect(() => db.delete(t).where(eq(t.id, id)), "/incidents/delays");
}
