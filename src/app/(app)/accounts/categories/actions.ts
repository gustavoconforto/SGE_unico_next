"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accountsAccounttype as accountType } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { REQUIRED, type FormState, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";
import { accountsInCategory } from "./data";

const categorySchema = z.object({ name: requiredText(100), direction: z.enum(["R", "P"], { error: REQUIRED }) });

export async function saveCategory(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("finance", "edit");
  const { data, values, state } = parseForm(categorySchema.partial({ direction: true }), formData);
  if (!data) return state;
  // Accounts only accept categories of their own direction, so it can't change once the category is in use
  const locked = id !== null && (await accountsInCategory(id)) > 0;
  if (!locked && !data.direction) return { errors: { direction: [REQUIRED] }, values };
  const fields = locked ? { name: data.name } : data;
  try {
    if (id === null) await db.insert(accountType).values(fields as { name: string; direction: string });
    else await db.update(accountType).set(fields).where(eq(accountType.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { name: ["Categoria financeira com este Nome já existe."] }, values };
    throw error;
  }
  redirect(`/accounts/categories?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteCategory(id: number) {
  await requirePermission("finance", "edit");
  await deleteAndRedirect(() => db.delete(accountType).where(eq(accountType.id, id)), "/accounts/categories", "category_protected");
}
