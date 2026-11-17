"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lessonsTimetableslot as slot } from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import type { FormErrors, FormState } from "@/lib/form";
import { INVALID_CHOICE, formValues } from "@/lib/form";
import { WEEKDAYS, periodError, weekdayPeriods } from "@/lib/lessons";
import { requireSession } from "@/lib/session";
import { classSlots, levelSubjects, seriesClass, teacherClash } from "../data";

/** The class's whole timetable (TimetableForm): "subject-teacher" per weekday and period; blank = no lesson. */
export async function saveTimetable(classId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const c = await seriesClass(classId);
  if (!c) redirect("/lessons/timetable");
  const [subjects, existing] = await Promise.all([levelSubjects(c.gradeLevel), classSlots(classId)]);
  const values = formValues(formData);
  const errors: FormErrors = {};
  const removed: number[] = [];
  const changed: { id?: number; weekday: number; period: number; subjectId: number; teacherId: number }[] = [];
  for (const [weekday] of WEEKDAYS)
    for (const [period] of weekdayPeriods(weekday)) {
      const name = `slot_${weekday}_${period}`;
      const value = values[name] ?? "";
      const saved = existing.find((s) => s.weekday === weekday && s.period === period);
      if (!value) {
        if (saved) removed.push(saved.id);
        continue;
      }
      const [subjectId, teacherId] = value.split("-").map(Number);
      const s = subjects.find((x) => x.id === subjectId);
      // Only the series' subjects, each with one of its teachers (the select's choices)
      if (!s || !s.teachers.some((t) => t.id === teacherId)) {
        errors[name] = [INVALID_CHOICE];
        continue;
      }
      if (saved && saved.subjectId === subjectId && saved.teacherId === teacherId) continue;
      const message = periodError(weekday, period) ?? (await teacherClash(c, teacherId, weekday, period));
      if (message) {
        errors[name] = [message];
        continue;
      }
      changed.push({ id: saved?.id, weekday, period, subjectId, teacherId });
    }
  if (Object.keys(errors).length) return { errors, values, formError: "Nada foi salvo." };
  try {
    await db.transaction(async (tx) => {
      for (const id of removed) await tx.delete(slot).where(and(eq(slot.id, id), eq(slot.schoolClassId, classId)));
      for (const s of changed) {
        if (s.id) await tx.update(slot).set({ subjectId: s.subjectId, teacherId: s.teacherId }).where(eq(slot.id, s.id));
        else await tx.insert(slot).values({ schoolClassId: classId, weekday: s.weekday, period: s.period, subjectId: s.subjectId, teacherId: s.teacherId });
      }
    });
  } catch (error) {
    // Two people saved this class's timetable at once (unique_timetable_slot)
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    return { values, formError: "Outra pessoa acabou de salvar o horário desta turma. Recarregue a página e confira. Nada foi salvo." };
  }
  redirect(`/lessons/timetable?school_class=${classId}&msg=updated`);
}
