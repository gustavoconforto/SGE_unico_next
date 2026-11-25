import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { idParam } from "@/lib/list";
import { classSlots, levelSubjects, seriesClass } from "../../../data";
import { TimetableForm } from "../../timetable-form";

export const metadata: Metadata = { title: "Editar grade horária" };

export default async function EditTimetablePage({ params }: PageProps<"/lessons/timetable/[id]/edit">) {
  await requirePermission("timetable", "edit");
  const c = await seriesClass(await idParam(params));
  if (!c) notFound();
  const [subjects, slots] = await Promise.all([levelSubjects(c.gradeLevel), classSlots(c.id)]);
  // "Matéria — Professor": a teacher of the subject in the series
  const choices = subjects.flatMap((s) =>
    s.teachers.map((t) => [`${s.id}-${t.id}`, `${s.name} — ${t.name}`] as [string, string]),
  );
  const initial = Object.fromEntries(
    slots.map((s) => [`slot_${s.weekday}_${s.period}`, `${s.subjectId}-${s.teacherId}`]),
  );
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar grade horária — {c.label}</h1>
      <TimetableForm classId={c.id} choices={choices} initial={initial} />
    </div>
  );
}
