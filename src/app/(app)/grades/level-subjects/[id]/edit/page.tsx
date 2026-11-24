import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  gradesGradelevelsubject as levelSubject,
  gradesGradelevelsubjectTeachers as levelSubjectTeachers,
} from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { LevelSubjectForm } from "../../level-subject-form";
import { levelSubjectFormOptions } from "../../options";

export const metadata: Metadata = { title: "Editar matéria na série" };

export default async function EditLevelSubjectPage({ params }: PageProps<"/grades/level-subjects/[id]/edit">) {
  await requirePermission("academicSetup", "edit");
  const id = await idParam(params);
  const [[row], links, options] = await Promise.all([
    db.select().from(levelSubject).where(eq(levelSubject.id, id)),
    db
      .select({ id: levelSubjectTeachers.employeeId })
      .from(levelSubjectTeachers)
      .where(eq(levelSubjectTeachers.gradelevelsubjectId, id)),
    levelSubjectFormOptions(),
  ]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar matéria na série</h1>
      <LevelSubjectForm id={id} defaults={row} teacherIds={links.map((l) => l.id)} {...options} />
    </div>
  );
}
