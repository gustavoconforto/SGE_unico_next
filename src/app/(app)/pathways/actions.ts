"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { pathwaysPathway as pathway } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { REQUIRED, type FormState, decimalField, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const schema = z.object({
  name: requiredText(50),
  description: z.string().default(""),
  extraPoints: decimalField({ maxDigits: 4, min: 0 }),
  workloadType: z.enum(["N", "F", "P"], { error: REQUIRED }),
  workloadHours: decimalField({ maxDigits: 6, min: 0, optional: true }),
});

export async function savePathway(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("pathways", "edit");
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  // Pathway.clean(): hours only for a fixed workload, and then required
  const workloadHours = data.workloadType === "F" ? data.workloadHours : "0.00";
  if (data.workloadType === "F" && (!workloadHours || Number(workloadHours) === 0)) return { errors: { workloadHours: ["Informe as horas da carga horária fixa."] }, values };
  const row = { ...data, workloadHours: workloadHours! };
  try {
    if (id === null) await db.insert(pathway).values(row);
    else await db.update(pathway).set(row).where(eq(pathway.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { name: ["Itinerário com este Nome já existe."] }, values };
    throw error;
  }
  redirect(`/pathways?msg=${id === null ? "created" : "updated"}`);
}

export async function deletePathway(id: number) {
  await requirePermission("pathways", "edit");
  await deleteAndRedirect(() => db.delete(pathway).where(eq(pathway.id, id)), "/pathways");
}
