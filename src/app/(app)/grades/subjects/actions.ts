"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { gradesSubject as subject } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, optionalForeignKey, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/access";

const subjectSchema = z.object({ name: requiredText(50), departmentId: optionalForeignKey });

export async function saveSubject(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("academicSetup.edit");
  const { data, values, state } = parseForm(subjectSchema, formData);
  if (!data) return state;
  try {
    if (id === null) await db.insert(subject).values(data);
    else await db.update(subject).set(data).where(eq(subject.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { name: ["Matéria com este nome já existe."] }, values };
    throw error;
  }
  redirect(`/grades/subjects?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteSubject(id: number) {
  await requirePermission("academicSetup.edit");
  await deleteAndRedirect(() => db.delete(subject).where(eq(subject.id, id)), "/grades/subjects");
}
