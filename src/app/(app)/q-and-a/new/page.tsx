import type { Metadata } from "next";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { currentSchoolYear } from "@/lib/concept-db";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { subjectOptions } from "../../grades/options";
import { SavedNote, savedStudent } from "@/components/saved-note";
import { QandAForm } from "../q-and-a-form";

export const metadata: Metadata = { title: "Novo plantão" };

export default async function NewQandAPage({ searchParams }: PageProps<"/q-and-a/new">) {
  const [enrollments, subjects] = await Promise.all([activeEnrollmentOptions(null, (await currentSchoolYear())?.id ?? null), subjectOptions()]);
  // After "Registrar e começar outra": the shared fields come back, and a new key clears the rest
  const sp = await searchParams;
  const saved = param(sp, "saved");
  const last = savedStudent(enrollments, param(sp, "last"));
  const defaults = { subjectId: param(sp, "subjectId"), qAndADate: param(sp, "qAndADate") || today() };
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo plantão</h1>
      <SavedNote text={last && `Plantão de ${last} registrado.`} />
      <QandAForm key={saved} defaults={defaults} again={!!saved} enrollments={enrollments} subjects={subjects.map((s) => [s.id, s.name])} />
    </div>
  );
}
