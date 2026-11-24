"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { incidentsIncident as t } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { foreignKey, type FormState, parseForm, anotherUrl } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";
import { enrollmentAllowed } from "@/app/(app)/enrollments/data";
import { INVALID_ENROLLMENT, recordFields } from "@/app/(app)/incidents/records";

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

export async function deleteRecord(id: number) {
  await requirePermission("incidents", "edit");
  await deleteAndRedirect(() => db.delete(t).where(eq(t.id, id)), "/incidents");
}
