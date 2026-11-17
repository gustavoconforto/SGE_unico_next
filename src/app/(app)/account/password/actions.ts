"use server";

import { APIError } from "better-auth/api";
import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { MIN_PASSWORD } from "@/lib/employee-login";
import { type FormState, parseForm, REQUIRED } from "@/lib/form";
import { requireSession } from "@/lib/session";

const schema = z
  .object({
    currentPassword: z.string().min(1, REQUIRED),
    newPassword: z.string().min(MIN_PASSWORD, `Use pelo menos ${MIN_PASSWORD} caracteres.`),
    confirmPassword: z.string(),
  })
  .refine((v) => v.confirmPassword === v.newPassword, { path: ["confirmPassword"], message: "As senhas não conferem." })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ["newPassword"], message: "Escolha uma senha diferente da atual." });

export async function changePassword(_prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const { data, state } = parseForm(schema, formData);
  if (!data) return { errors: state.errors }; // no `values`: passwords are never echoed back
  try {
    // Better Auth checks the current password, rehashes and signs out the user's other devices
    await auth.api.changePassword({
      body: { currentPassword: data.currentPassword, newPassword: data.newPassword, revokeOtherSessions: true },
      headers: await headers(),
    });
  } catch (error) {
    if (error instanceof APIError && error.body?.code === "INVALID_PASSWORD") return { errors: { currentPassword: ["Senha atual incorreta."] } };
    throw error;
  }
  await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, session.user.id));
  redirect("/?msg=password_changed");
}
