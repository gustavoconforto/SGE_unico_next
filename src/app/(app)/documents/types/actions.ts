"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { documentsDocumenttype as documentType } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const schema = z.object({ type: requiredText(100) });

export async function saveDocumentType(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("documents", "edit");
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  try {
    if (id === null) await db.insert(documentType).values(data);
    else await db.update(documentType).set(data).where(eq(documentType.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      return { errors: { type: ["Já existe um tipo de documento com este nome."] }, values };
    throw error;
  }
  redirect(`/documents/types?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteDocumentType(id: number) {
  await requirePermission("documents", "edit");
  await deleteAndRedirect(
    () => db.delete(documentType).where(eq(documentType.id, id)),
    "/documents/types",
    "document_type_protected",
  );
}
