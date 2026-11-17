"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { classesClass } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, foreignKey, optionalSmallInt, parseForm, requiredText } from "@/lib/form";
import { requireSession } from "@/lib/session";

const classSchema = z.object({
  programId: foreignKey,
  yearId: foreignKey,
  gradeLevel: optionalSmallInt,
  name: requiredText(30),
  capacity: optionalSmallInt,
});

export async function saveClass(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(classSchema, formData);
  if (!data) return state;
  try {
    // Shift isn't on Django's ClassForm either; new classes start blank
    if (id === null) await db.insert(classesClass).values({ ...data, shift: "" });
    else await db.update(classesClass).set(data).where(eq(classesClass.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { formError: "Turma com este Ano letivo, Curso e Nome já existe.", values };
    throw error;
  }
  redirect(`/classes?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteClass(id: number) {
  await requireSession();
  await deleteAndRedirect(() => db.delete(classesClass).where(eq(classesClass.id, id)), "/classes");
}
