"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { portalAlert } from "@/db/schema/app";
import { requirePermission } from "@/lib/authorization";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, optionalForeignKey, parseForm, requiredText } from "@/lib/form";

const alertSchema = z.object({
  title: requiredText(120),
  body: requiredText(2000),
  schoolClassId: optionalForeignKey,
});

// No edit: guardians may already have read (or been notified of) what was sent
export async function createAlert(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("alerts", "edit");
  const { data, state } = parseForm(alertSchema, formData);
  if (!data) return state;
  await db.insert(portalAlert).values(data);
  redirect("/alerts?msg=created");
}

export async function deleteAlert(id: number) {
  await requirePermission("alerts", "edit");
  await deleteAndRedirect(() => db.delete(portalAlert).where(eq(portalAlert.id, id)), "/alerts");
}
