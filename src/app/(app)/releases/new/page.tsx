import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { SavedNote, savedStudent } from "@/components/saved-note";
import { reasonOptions } from "../reasons/options";
import { ExitForm } from "../record-form";

export const metadata: Metadata = { title: "Nova liberação" };

export default async function NewExitPage({ searchParams }: PageProps<"/releases/new">) {
  await requirePermission("releases", "edit");
  // After "Registrar e começar outra": the shared fields come back, and a new key clears the rest
  const sp = await searchParams;
  const saved = param(sp, "saved");
  const [enrollments, reasons] = await Promise.all([activeEnrollmentOptions(), reasonOptions()]);
  const last = savedStudent(enrollments, param(sp, "last"));
  const defaults = { reasonId: param(sp, "reasonId"), exitDate: param(sp, "exitDate") || today() };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova liberação</h1>
      <SavedNote text={last && `Liberação de ${last} registrada.`} />
      <ExitForm key={saved} defaults={defaults} again={!!saved} enrollments={enrollments} reasons={reasons} />
    </div>
  );
}
