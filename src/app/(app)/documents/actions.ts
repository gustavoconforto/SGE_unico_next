"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { documentsReceiveddocument as t } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { FOREIGN_KEY_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { INVALID_CHOICE, type FormState, anotherUrl, foreignKey, parseForm, requiredDate } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";
import { enrollmentAllowed } from "@/app/(app)/enrollments/data";
import { INVALID_ENROLLMENT } from "@/app/(app)/incidents/records";

const schema = z.object({ enrollmentId: foreignKey, receivedDate: requiredDate, documentTypeId: foreignKey });

export async function saveReceivedDocument(
  id: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("documents", "edit");
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const [current] = id ? await db.select({ enrollmentId: t.enrollmentId }).from(t).where(eq(t.id, id)) : [];
  // Only active enrollments, or the one the record already has
  if (!(await enrollmentAllowed(data.enrollmentId, current?.enrollmentId)))
    return { errors: INVALID_ENROLLMENT, values };
  let newId: number | null = null;
  try {
    if (id === null) [{ id: newId }] = await db.insert(t).values(data).returning({ id: t.id });
    else await db.update(t).set(data).where(eq(t.id, id));
  } catch (error) {
    // The type was deleted meanwhile
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { errors: { documentTypeId: [INVALID_CHOICE] }, values };
    throw error;
  }
  if (newId !== null) {
    const next = anotherUrl("/documents/new", formData, ["documentTypeId", "receivedDate"], newId);
    if (next) redirect(next);
  }
  redirect(`/documents?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteReceivedDocument(id: number) {
  await requirePermission("documents", "edit");
  await deleteAndRedirect(() => db.delete(t).where(eq(t.id, id)), "/documents");
}
