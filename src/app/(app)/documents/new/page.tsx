import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { SavedNote, savedStudent } from "@/components/saved-note";
import { documentTypeOptions } from "../types/options";
import { ReceivedDocumentForm } from "../record-form";

export const metadata: Metadata = { title: "Registrar documento" };

export default async function NewReceivedDocumentPage({ searchParams }: PageProps<"/documents/new">) {
  await requirePermission("documents", "edit");
  // After "Registrar e começar outro": the shared fields come back, and a new key clears the rest
  const sp = await searchParams;
  const saved = param(sp, "saved");
  const [enrollments, types] = await Promise.all([activeEnrollmentOptions(), documentTypeOptions()]);
  const last = savedStudent(enrollments, param(sp, "last"));
  const defaults = { documentTypeId: param(sp, "documentTypeId"), receivedDate: param(sp, "receivedDate") || today() };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Registrar documento</h1>
      <SavedNote text={last && `Documento de ${last} registrado.`} />
      <ReceivedDocumentForm key={saved} defaults={defaults} again={!!saved} enrollments={enrollments} types={types} />
    </div>
  );
}
