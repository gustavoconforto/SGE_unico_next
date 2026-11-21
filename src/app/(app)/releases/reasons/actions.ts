"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { releasesExitreason as reason } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, parseForm, requiredText } from "@/lib/form";
import { requireSession } from "@/lib/session";

const schema = z.object({ reason: requiredText(100) });

export async function saveReason(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  try {
    if (id === null) await db.insert(reason).values(data);
    else await db.update(reason).set(data).where(eq(reason.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { reason: ["Já existe um motivo com este nome."] }, values };
    throw error;
  }
  redirect(`/releases/reasons?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteReason(id: number) {
  await requireSession();
  await deleteAndRedirect(() => db.delete(reason).where(eq(reason.id, id)), "/releases/reasons", "reason_protected");
}
