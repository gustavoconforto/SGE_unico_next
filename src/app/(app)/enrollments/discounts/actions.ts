"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsDiscounttype as discountType } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, decimalField, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/access";

const discountSchema = z.object({ description: requiredText(200), percentage: decimalField({ maxDigits: 5, min: 0, max: 100 }) });

export async function saveDiscountType(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("enrollmentSetup.edit");
  const { data, state } = parseForm(discountSchema, formData);
  if (!data) return state;
  if (id === null) await db.insert(discountType).values(data);
  else await db.update(discountType).set(data).where(eq(discountType.id, id));
  redirect(`/enrollments/discounts?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteDiscountType(id: number) {
  await requirePermission("enrollmentSetup.edit");
  await deleteAndRedirect(() => db.delete(discountType).where(eq(discountType.id, id)), "/enrollments/discounts");
}
