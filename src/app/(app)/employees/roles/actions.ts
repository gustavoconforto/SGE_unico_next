"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { employeesEmployeeroletype } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, parseForm, requiredText } from "@/lib/form";
import { requireSession } from "@/lib/session";

const roleSchema = z.object({ role: requiredText(20) });

export async function saveRole(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, state } = parseForm(roleSchema, formData);
  if (!data) return state;
  if (id === null) await db.insert(employeesEmployeeroletype).values(data);
  else await db.update(employeesEmployeeroletype).set(data).where(eq(employeesEmployeeroletype.id, id));
  redirect(`/employees/roles?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteRole(id: number) {
  await requireSession();
  await deleteAndRedirect(() => db.delete(employeesEmployeeroletype).where(eq(employeesEmployeeroletype.id, id)), "/employees/roles");
}
