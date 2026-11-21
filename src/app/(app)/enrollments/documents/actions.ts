"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsNeededdocumenttype as documentType } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, parseForm, requiredText } from "@/lib/form";
import { requireSession } from "@/lib/session";

const documentSchema = z.object({ description: requiredText(50) });

export async function saveDocumentType(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, state } = parseForm(documentSchema, formData);
  if (!data) return state;
  if (id === null) await db.insert(documentType).values(data);
  else await db.update(documentType).set(data).where(eq(documentType.id, id));
  redirect(`/enrollments/documents?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteDocumentType(id: number) {
  await requireSession();
  await deleteAndRedirect(() => db.delete(documentType).where(eq(documentType.id, id)), "/enrollments/documents");
}
