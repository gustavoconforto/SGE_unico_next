import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { incidentsIncident as t } from "@/db/schema/app";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { incidentTypeOptions } from "@/app/(app)/incidents/types/options";
import { idParam } from "@/lib/list";
import { RecordForm } from "../../record-form";

export const metadata: Metadata = { title: "Editar ocorrência" };

export default async function EditRecordPage({ params }: PageProps<"/incidents/[id]/edit">) {
  await requirePermission("incidents", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(t).where(eq(t.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar ocorrência</h1>
      <RecordForm id={id} defaults={row} enrollments={await activeEnrollmentOptions(row.enrollmentId)} types={await incidentTypeOptions()} />
    </div>
  );
}
