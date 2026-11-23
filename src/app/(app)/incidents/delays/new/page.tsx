import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { SavedNote, savedStudent } from "@/components/saved-note";
import { RecordForm } from "../record-form";

export const metadata: Metadata = { title: "Novo atraso" };

export default async function NewRecordPage({ searchParams }: PageProps<"/incidents/delays/new">) {
  await requirePermission("incidents", "edit");
  // After "Registrar e começar outra": the shared fields come back, and a new key clears the rest
  const sp = await searchParams;
  const saved = param(sp, "saved");
  const enrollments = await activeEnrollmentOptions();
  const last = savedStudent(enrollments, param(sp, "last"));
  const defaults = { delayType: param(sp, "delayType"), incidentDate: param(sp, "incidentDate") || today() };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo atraso</h1>
      <SavedNote text={last && `Atraso de ${last} registrado.`} />
      <RecordForm key={saved} defaults={defaults} again={!!saved} enrollments={enrollments} />
    </div>
  );
}
