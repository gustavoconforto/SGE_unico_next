"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { incidentsIncident as t } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { INVALID_CHOICE, foreignKey, type FormState, parseForm, anotherUrl, formIds, formValues } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";
import { enrollmentAllowed } from "@/app/(app)/enrollments/data";
import { INVALID_ENROLLMENT, batchEnrollmentError, recordFields } from "@/app/(app)/incidents/records";

const schema = z.object({ ...recordFields, incidentTypeId: foreignKey });

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
    const next = anotherUrl("/incidents/new", formData, ["incidentTypeId", "incidentDate"], row.id);
    if (next) redirect(next);
  } else await db.update(t).set(data).where(eq(t.id, id));
  redirect(`/incidents?msg=${id === null ? "created" : "updated"}`);
}

const batchSchema = schema.omit({ enrollmentId: true });

/** One incident per checked student, all with the same type and date. */
export async function saveBatchRecords(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("incidents", "edit");
  const { data, state } = parseForm(batchSchema, formData);
  if (!data) return state;
  const ids = formIds(formData, "enrollmentId");
  const values = formValues(formData);
  const formError = await batchEnrollmentError(ids);
  if (formError) return { formError, values };
  try {
    await db.insert(t).values(ids.map((enrollmentId) => ({ enrollmentId, ...data })));
  } catch (error) {
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { errors: { incidentTypeId: [INVALID_CHOICE] }, values };
    throw error;
  }
  redirect("/incidents?msg=incidents_created");
}

export async function deleteRecord(id: number) {
  await requirePermission("incidents", "edit");
  await deleteAndRedirect(() => db.delete(t).where(eq(t.id, id)), "/incidents");
}
