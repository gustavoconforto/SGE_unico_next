import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { incidentTypeOptions } from "@/app/(app)/incidents/types/options";
import { SavedNote, savedStudent } from "@/components/saved-note";
import { RecordForm } from "../record-form";

export const metadata: Metadata = { title: "Nova ocorrência" };

export default async function NewRecordPage({ searchParams }: PageProps<"/incidents/new">) {
  await requirePermission("incidents", "edit");
  // After "Registrar e começar outra": the shared fields come back, and a new key clears the rest
  const sp = await searchParams;
  const saved = param(sp, "saved");
  const enrollments = await activeEnrollmentOptions();
  const last = savedStudent(enrollments, param(sp, "last"));
  const defaults = { incidentTypeId: param(sp, "incidentTypeId"), incidentDate: param(sp, "incidentDate") || today() };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova ocorrência</h1>
      <SavedNote text={last && `Ocorrência de ${last} registrada.`} />
      <RecordForm
        key={saved}
        defaults={defaults}
        again={!!saved}
        enrollments={enrollments}
        types={await incidentTypeOptions()}
      />
    </div>
  );
}
