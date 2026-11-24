"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  pathwaysPathwayoffering as offering,
  pathwaysPathwayofferingTeachers as offeringTeachers,
} from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, INVALID_CHOICE, foreignKey, formIds, optionalText, parseForm } from "@/lib/form";
import { requirePermission } from "@/lib/authorization";

const schema = z.object({
  pathwayId: foreignKey,
  schoolYearId: foreignKey,
  name: optionalText(30),
  schedule: optionalText(100),
  capacity: z
    .string()
    .default("")
    .transform((v, ctx) => {
      if (!v.trim()) return null;
      const n = Number(v);
      if (!Number.isInteger(n) || n < 1 || n > 32767) {
        ctx.addIssue({ code: "custom", message: "Informe ao menos uma vaga." });
        return z.NEVER;
      }
      return n;
    }),
});

export async function saveOffering(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("pathways", "edit");
  const teacherIds = formIds(formData, "teachers");
  // PathwayOffering.clean(): Monday (1) to Saturday (6), sorted
  const weekdays = formIds(formData, "weekdays").sort((a, b) => a - b);
  const { data, values, state } = parseForm(schema, formData);
  values.teachers = teacherIds.join(",");
  values.weekdays = weekdays.join(",");
  if (!data) return { ...state, values };
  if (weekdays.some((d) => d < 1 || d > 6))
    return { errors: { weekdays: ["Escolha dias de segunda a sábado."] }, values };
  try {
    await db.transaction(async (tx) => {
      let offeringId = id;
      if (offeringId === null)
        [{ id: offeringId }] = await tx
          .insert(offering)
          .values({ ...data, weekdays })
          .returning({ id: offering.id });
      else
        await tx
          .update(offering)
          .set({ ...data, weekdays })
          .where(eq(offering.id, offeringId));
      await tx.delete(offeringTeachers).where(eq(offeringTeachers.pathwayofferingId, offeringId));
      if (teacherIds.length)
        await tx
          .insert(offeringTeachers)
          .values(teacherIds.map((employeeId) => ({ pathwayofferingId: offeringId!, employeeId })));
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION)
      return { errors: { name: ["Já existe uma turma deste itinerário com este nome no ano escolar."] }, values };
    // A teacher, pathway or school year deleted while the form was open
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { formError: INVALID_CHOICE, values };
    throw error;
  }
  redirect(`/pathways/offerings?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteOffering(id: number) {
  await requirePermission("pathways", "edit");
  await deleteAndRedirect(
    () =>
      db.transaction(async (tx) => {
        await tx.delete(offeringTeachers).where(eq(offeringTeachers.pathwayofferingId, id));
        await tx.delete(offering).where(eq(offering.id, id));
      }),
    "/pathways/offerings",
  );
}
