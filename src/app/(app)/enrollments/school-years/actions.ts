"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsSchoolyear } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, intField, optionalDate, parseForm, requiredDate } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const schoolYearSchema = z.object({
  begins: requiredDate,
  ends: requiredDate,
  bi1Begins: optionalDate,
  bi1Ends: optionalDate,
  bi2Begins: optionalDate,
  bi2Ends: optionalDate,
  bi3Begins: optionalDate,
  bi3Ends: optionalDate,
  bi4Begins: optionalDate,
  bi4Ends: optionalDate,
  // Nullable in the table only for years created before these fields
  schoolDays: intField(1, 32767),
  totalHours: intField(1, 2147483647),
});

export async function saveSchoolYear(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("enrollmentSetup", "edit");
  const { data, state } = parseForm(schoolYearSchema, formData);
  if (!data) return state;
  if (id === null) await db.insert(enrollmentsSchoolyear).values(data);
  else await db.update(enrollmentsSchoolyear).set(data).where(eq(enrollmentsSchoolyear.id, id));
  redirect(`/enrollments/school-years?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteSchoolYear(id: number) {
  await requirePermission("enrollmentSetup", "edit");
  await deleteAndRedirect(
    () => db.delete(enrollmentsSchoolyear).where(eq(enrollmentsSchoolyear.id, id)),
    "/enrollments/school-years",
  );
}
