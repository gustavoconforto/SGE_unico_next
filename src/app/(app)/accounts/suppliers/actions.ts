"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accountsSupplier as supplier } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, optionalText, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const supplierSchema = z.object({
  name: requiredText(200),
  document: z
    .string()
    .trim()
    .default("")
    .refine((v) => v === "" || /^\d+$/.test(v), "Informe somente números.")
    .refine((v) => v === "" || !/^\d+$/.test(v) || v.length === 11 || v.length === 14, "O CPF deve ter 11 dígitos e o CNPJ, 14."),
  phone: optionalText(20),
  email: z.union([z.literal(""), z.email("Informe um endereço de email válido.").max(254)]).default(""),
  notes: z.string().default(""),
});

export async function saveSupplier(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("finance", "edit");
  const { data, values, state } = parseForm(supplierSchema, formData);
  if (!data) return state;
  try {
    if (id === null) await db.insert(supplier).values(data);
    else await db.update(supplier).set(data).where(eq(supplier.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { document: ["Já existe um fornecedor com este CPF/CNPJ."] }, values };
    throw error;
  }
  redirect(`/accounts/suppliers?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteSupplier(id: number) {
  await requirePermission("finance", "edit");
  await deleteAndRedirect(() => db.delete(supplier).where(eq(supplier.id, id)), "/accounts/suppliers", "supplier_protected");
}
