"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { incidentsIncidenttype as incidentType } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, decimalField, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const typeSchema = z.object({
  type: requiredText(100),
  penalty: decimalField({ maxDigits: 4, places: 1, min: 0, minMessage: "A penalidade não pode ser negativa." }),
});

export async function saveIncidentType(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("academicSetup", "edit");
  const { data, values, state } = parseForm(typeSchema, formData);
  if (!data) return state;
  try {
    if (id === null) await db.insert(incidentType).values(data);
    else await db.update(incidentType).set(data).where(eq(incidentType.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      return { errors: { type: ["Tipo de ocorrência com este Tipo já existe."] }, values };
    throw error;
  }
  redirect(`/incidents/types?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteIncidentType(id: number) {
  await requirePermission("academicSetup", "edit");
  await deleteAndRedirect(
    () => db.delete(incidentType).where(eq(incidentType.id, id)),
    "/incidents/types",
    "incident_type_protected",
  );
}
