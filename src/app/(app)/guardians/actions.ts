"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { studentsGuardian } from "@/db/schema/app";
import { type FormState, parseForm } from "@/lib/form";
import { personFields, personUniqueError, phoneDigits } from "@/lib/person";
import { requirePermission } from "@/lib/access";
import { MARITAL_STATUS } from "@/lib/students";

const guardianSchema = z.object({
  ...personFields,
  phone: phoneDigits,
  mobile: phoneDigits,
  maritalStatus: z.enum(["", ...MARITAL_STATUS.map(([code]) => code)]).default(""),
});

// Django has no guardian delete screen; guardians are PROTECT-linked to students.
export async function saveGuardian(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("students.edit");
  const { data, values, state } = parseForm(guardianSchema, formData);
  if (!data) return state;
  try {
    if (id === null) await db.insert(studentsGuardian).values(data);
    else await db.update(studentsGuardian).set(data).where(eq(studentsGuardian.id, id));
  } catch (error) {
    const errors = personUniqueError(error);
    if (errors) return { errors, values };
    throw error;
  }
  redirect(`/guardians?msg=${id === null ? "created" : "updated"}`);
}
