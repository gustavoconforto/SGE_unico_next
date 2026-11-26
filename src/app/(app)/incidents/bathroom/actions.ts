"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { incidentsBathroompermission as t } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { REQUIRED, type FormState, parseForm, anotherUrl, foreignKey, requiredDate } from "@/lib/form";
import { bathroomCells } from "@/lib/incidents";
import { requirePermission } from "@/lib/authorization";
import { enrollmentAllowed } from "@/app/(app)/enrollments/data";
import { INVALID_ENROLLMENT, batchEnrollmentError, recordFields } from "@/app/(app)/incidents/records";

const schema = z.object({
  ...recordFields,
  classPeriod: z.coerce
    .number({ error: REQUIRED })
    .int("Informe um número inteiro.")
    .min(1, "O horário deve ser maior que zero.")
    .max(32767),
});

export async function saveRecord(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("incidents", "edit");
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const [current] = id ? await db.select({ enrollmentId: t.enrollmentId }).from(t).where(eq(t.id, id)) : [];
  // Only active enrollments, or the one the record already has (ActiveEnrollmentFormMixin)
  if (!(await enrollmentAllowed(data.enrollmentId, current?.enrollmentId)))
    return { errors: INVALID_ENROLLMENT, values };
  if (id === null) {
    const [row] = await db.insert(t).values(data).returning({ id: t.id });
    const next = anotherUrl("/incidents/bathroom/new", formData, ["classPeriod", "incidentDate"], row.id);
    if (next) redirect(next);
  } else await db.update(t).set(data).where(eq(t.id, id));
  redirect(`/incidents/bathroom?msg=${id === null ? "created" : "updated"}`);
}

const batchSchema = z.object({ incidentDate: requiredDate, schoolClassId: foreignKey });

/** One pass per checked student × period of the class grid, all on the same date. */
export async function saveBatchRecords(_prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("incidents", "edit");
  const { data } = parseForm(batchSchema, formData);
  if (!data) return { formError: "Escolha a data e a turma novamente." };
  const cells = bathroomCells(formData.getAll("cell").map(String));
  if (!cells) return { formError: "Algum horário marcado é inválido. Recarregue a página." };
  if (!cells.length) return { formError: "Marque ao menos um horário." };
  const formError = await batchEnrollmentError([...new Set(cells.map((c) => c.enrollmentId))], data.schoolClassId);
  if (formError) return { formError };
  await db.insert(t).values(cells.map((c) => ({ ...c, incidentDate: data.incidentDate })));
  redirect("/incidents/bathroom?msg=bathroom_created");
}

export async function deleteRecord(id: number) {
  await requirePermission("incidents", "edit");
  await deleteAndRedirect(() => db.delete(t).where(eq(t.id, id)), "/incidents/bathroom");
}
