"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { studentsGuardian } from "@/db/schema/app";
import { checkbox, type FormErrors, type FormState, parseForm } from "@/lib/form";
import { applyLoginPlan, loginPlan, ownerLogin, usernameTaken } from "@/lib/login";
import { personFields, personUniqueError, phoneDigits } from "@/lib/person";
import { requirePermission } from "@/lib/authorization";
import { MARITAL_STATUS } from "@/lib/students";

const guardianSchema = z.object({
  ...personFields,
  phone: phoneDigits,
  mobile: phoneDigits,
  maritalStatus: z.enum(["", ...MARITAL_STATUS.map(([code]) => code)]).default(""),
});

const loginSchema = z.object({ access: checkbox, password: z.string().default("") });

// Django has no guardian delete screen; guardians are PROTECT-linked to students.
// The portal login is the guardian's CPF; whoever edits guardians gives it a password (it grants no staff access).
export async function saveGuardian(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("students", "edit");
  const { data, values, state } = parseForm(guardianSchema, formData);
  const login = { ...loginSchema.parse(values), username: data?.cpf ?? "" };
  delete values.password; // never echo a typed password back to the browser

  const current = id !== null ? await ownerLogin({ guardianId: id }) : undefined;
  const { plan, errors: loginErrors = {} } = data ? loginPlan(login, !!current) : { plan: "none" as const };
  const errors: FormErrors = { ...state?.errors };
  if (loginErrors.password) errors.password = loginErrors.password;
  if (loginErrors.username) errors.cpf = ["Informe o CPF: ele é o usuário do portal."];
  else if ((plan === "create" || plan === "update") && (await usernameTaken(login.username, current?.id)))
    errors.cpf = ["Este CPF já é usuário de outro acesso."];
  if (!data || Object.keys(errors).length) return { errors, values };

  let guardianId = id;
  try {
    if (id === null)
      [{ id: guardianId }] = await db.insert(studentsGuardian).values(data).returning({ id: studentsGuardian.id });
    else await db.update(studentsGuardian).set(data).where(eq(studentsGuardian.id, id));
  } catch (error) {
    const errors = personUniqueError(error);
    if (errors) return { errors, values };
    throw error;
  }

  if (plan !== "none") {
    try {
      await applyLoginPlan(plan, { guardianId: guardianId! }, data.name, login, current);
    } catch (error) {
      // Better Auth can't join the insert's transaction: undo a new guardian so a failed save leaves nothing
      if (id === null) await db.delete(studentsGuardian).where(eq(studentsGuardian.id, guardianId!));
      throw error;
    }
  }
  redirect(`/guardians?msg=${id === null ? "created" : "updated"}`);
}
