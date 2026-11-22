"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { qAndAQanda as qa } from "@/db/schema/app";
import { currentSchoolYear } from "@/lib/concept-db";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, foreignKey, parseForm, requiredDate, anotherUrl } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";
import { enrollmentAllowed } from "../enrollments/data";
import { INVALID_ENROLLMENT } from "../incidents/records";

const schema = z.object({ enrollmentId: foreignKey, subjectId: foreignKey, qAndADate: requiredDate });

export async function saveQandA(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("lessons", "edit");
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const [current] = id ? await db.select({ enrollmentId: qa.enrollmentId }).from(qa).where(eq(qa.id, id)) : [];
  // Only active enrollments of the current school year, keeping the saved one when editing
  if (!(await enrollmentAllowed(data.enrollmentId, current?.enrollmentId, (await currentSchoolYear())?.id ?? null))) return { errors: INVALID_ENROLLMENT, values };
  if (id === null) {
    const [row] = await db.insert(qa).values(data).returning({ id: qa.id });
    const next = anotherUrl("/q-and-a/new", formData, ["subjectId", "qAndADate"], row.id);
    if (next) redirect(next);
  } else await db.update(qa).set(data).where(eq(qa.id, id));
  redirect(`/q-and-a?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteQandA(id: number) {
  await requirePermission("lessons", "edit");
  await deleteAndRedirect(() => db.delete(qa).where(eq(qa.id, id)), "/q-and-a");
}
