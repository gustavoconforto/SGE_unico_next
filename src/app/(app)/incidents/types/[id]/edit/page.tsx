import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { incidentsIncidenttype as incidentType } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { IncidentTypeForm } from "../../type-form";

export const metadata: Metadata = { title: "Editar tipo de ocorrência" };

export default async function EditIncidentTypePage({ params }: PageProps<"/incidents/types/[id]/edit">) {
  await requirePermission("academicSetup", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(incidentType).where(eq(incidentType.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar tipo de ocorrência</h1>
      <IncidentTypeForm id={id} defaults={row} />
    </div>
  );
}
