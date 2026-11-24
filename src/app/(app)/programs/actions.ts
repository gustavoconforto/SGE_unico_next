"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { programsProgram } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const programSchema = z.object({ name: requiredText(50) });

export async function saveProgram(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("programs", "edit");
  const { data, values, state } = parseForm(programSchema, formData);
  if (!data) return state;

  try {
    if (id === null) await db.insert(programsProgram).values(data);
    else await db.update(programsProgram).set(data).where(eq(programsProgram.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      return { errors: { name: ["Curso com este Nome já existe."] }, values };
    throw error;
  }
  redirect(`/programs?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteProgram(id: number) {
  await requirePermission("programs", "edit");
  await deleteAndRedirect(() => db.delete(programsProgram).where(eq(programsProgram.id, id)), "/programs");
}
