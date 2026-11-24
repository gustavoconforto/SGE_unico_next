import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { param } from "@/lib/list";
import { LevelSubjectForm } from "../level-subject-form";
import { levelSubjectFormOptions } from "../options";

export const metadata: Metadata = { title: "Nova matéria na série" };

export default async function NewLevelSubjectPage({ searchParams }: PageProps<"/grades/level-subjects/new">) {
  await requirePermission("academicSetup", "edit");
  const level = Number(param(await searchParams, "grade_level"));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova matéria na série</h1>
      <LevelSubjectForm
        {...await levelSubjectFormOptions()}
        defaults={[1, 2, 3].includes(level) ? { gradeLevel: level } : undefined}
      />
    </div>
  );
}
