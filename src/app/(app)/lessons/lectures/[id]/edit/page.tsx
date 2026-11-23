import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { lessonsLecture as lecture } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { levelSubjects, levelTeachers, seriesClass } from "../../../data";
import { LectureForm } from "../../lecture-form";

export const metadata: Metadata = { title: "Editar aula" };

export default async function EditLecturePage({ params }: PageProps<"/lessons/lectures/[id]/edit">) {
  await requirePermission("lessons", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(lecture).where(eq(lecture.id, id));
  const c = row ? await seriesClass(row.schoolClassId) : null;
  if (!row || !c) notFound();
  const subjects = await levelSubjects(c.gradeLevel);
  const teachers = await levelTeachers(subjects);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar aula</h1>
      <LectureForm id={id} defaults={row} classLabel={c.label} subjects={subjects.map((s) => [s.id, s.name])} teachers={teachers.map((t) => [t.id, t.name])} />
    </div>
  );
}
