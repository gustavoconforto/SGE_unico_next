"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsEnrollmenttype as enrollmentType, enrollmentsSchoolyear as schoolYear } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, decimalField, foreignKey, parseForm } from "@/lib/form";
import { requirePermission } from "@/lib/access";

const enrollmentTypeSchema = z.object({
  programId: foreignKey,
  level: z.enum(["", "1", "2", "3"]).default(""),
  totalPrice: decimalField({ min: 0 }),
  punctualityDiscount: decimalField({ min: 0 }),
  description: z.string().trim().default(""),
  schoolYearId: foreignKey,
});

export async function saveEnrollmentType(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("enrollmentSetup.edit");
  const { data, values, state } = parseForm(enrollmentTypeSchema, formData);
  if (!data) return state;
  if (id === null) {
    // EnrollmentType.save(): the contract runs for the whole school year
    const [year] = await db.select().from(schoolYear).where(eq(schoolYear.id, data.schoolYearId));
    if (!year) return { errors: { schoolYearId: ["Selecione uma opção válida."] }, values };
    await db.insert(enrollmentType).values({ ...data, startDate: year.begins, endDate: year.ends });
  } else {
    await db.update(enrollmentType).set(data).where(eq(enrollmentType.id, id));
  }
  redirect(`/enrollments/types?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteEnrollmentType(id: number) {
  await requirePermission("enrollmentSetup.edit");
  await deleteAndRedirect(() => db.delete(enrollmentType).where(eq(enrollmentType.id, id)), "/enrollments/types");
}
