import { requirePermission } from "@/lib/authorization";
import { Alert } from "flowbite-react";
import type { Metadata } from "next";
import { lectureDateError } from "@/lib/lessons";
import { param } from "@/lib/list";
import { ClassDatePicker } from "../../class-picker";
import { dayLessons, levelSubjects, levelTeachers, seriesClasses } from "../../data";
import { DaySheet } from "../day-sheet";

export const metadata: Metadata = { title: "Lançamento do dia" };

export default async function LectureDayPage({ searchParams }: PageProps<"/lessons/lectures/day">) {
  await requirePermission("lessons", "edit");
  const [classes, sp] = await Promise.all([seriesClasses(), searchParams]);
  const c = classes.find((x) => x.id === Number(param(sp, "school_class"))) ?? null;
  const date = /^\d{4}-\d{2}-\d{2}$/.test(param(sp, "date")) ? param(sp, "date") : "";
  const dateError = c && date ? lectureDateError(date, c.begins, c.ends) : null;
  let sheet = null;
  if (c && date && !dateError) {
    const [subjects, lessons] = await Promise.all([levelSubjects(c.gradeLevel), dayLessons(c.id, date)]);
    const teachers = await levelTeachers(subjects);
    // Prefilled from the saved lecture or, when none, from the timetable
    const rows = lessons.map(({ period, label, lecture: l, slot: planned }) => {
      const source = l ?? planned;
      return {
        period,
        label,
        subjectId: source?.subjectId ?? null,
        teacherId: source?.teacherId ?? null,
        topic: l?.topic ?? "",
        saved: !!l,
      };
    });
    sheet = {
      rows,
      subjects: subjects.map((s) => [s.id, s.name] as [number, string]),
      teachers: teachers.map((t) => [t.id, t.name] as [number, string]),
    };
  }
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Lançamento do dia</h1>
      <ClassDatePicker classes={classes.map((x) => [x.id, x.label])} classId={c?.id ?? null} date={date} withDate />
      {dateError && <Alert color="failure">{dateError}</Alert>}
      {sheet ? (
        <DaySheet key={`${c!.id}-${date}`} classId={c!.id} date={date} {...sheet} />
      ) : (
        !dateError && <p className="text-gray-500">Selecione a turma e a data.</p>
      )}
    </div>
  );
}
