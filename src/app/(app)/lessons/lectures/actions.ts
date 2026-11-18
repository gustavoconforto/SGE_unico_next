"use server";

import { and, eq, ne } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { lessonsLecture as lecture } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormErrors, type FormState, foreignKey, formValues, intField, parseForm, requiredDate, requiredText } from "@/lib/form";
import { isoWeekday } from "@/lib/dates";
import { lectureDateError, periodError, weekdayPeriods } from "@/lib/lessons";
import { requirePermission } from "@/lib/access";
import { type SeriesClass, lectureTeacherIds, levelSubjects, seriesClass } from "../data";

const PERIOD_TAKEN = "Já existe uma aula desta turma nesta data e horário.";
// Two people saved the same class and day at once (unique_lecture)
const TAKEN_BY_ANOTHER = "Outra pessoa acabou de salvar aulas desta turma neste dia. Recarregue a página e confira. Nenhuma aula foi salva.";

/** Lecture.clean(): date in the class's year and Monday–Saturday, a period the weekday has, the series'
 * subject, and a teacher of it (or of its department, as a substitute). Field → message. */
async function lectureErrors(c: SeriesClass, date: string, period: number, subjectId: number, teacherId: number) {
  const errors: Record<string, string> = {};
  const dateError = lectureDateError(date, c.begins, c.ends);
  if (dateError) errors.date = dateError;
  const pError = periodError(isoWeekday(date), period);
  if (pError) errors.period = pError;
  const s = (await levelSubjects(c.gradeLevel)).find((x) => x.id === subjectId);
  if (!s) errors.subject = "Esta matéria não é oferecida na série da turma.";
  else if (!(await lectureTeacherIds(s)).has(teacherId)) errors.teacher = "Este professor não é do departamento da matéria.";
  return errors;
}

/** The class's lectures on a date (LectureDayForm): rows with a topic are kept, clearing it deletes the lecture. */
export async function saveLectureDay(classId: number, date: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("lessons.edit");
  const c = await seriesClass(classId);
  if (!c || lectureDateError(date, c.begins, c.ends)) redirect(`/lessons/lectures/day?school_class=${classId}&date=${date}`);
  const values = formValues(formData);
  const errors: FormErrors = {};
  const existing = await db.select().from(lecture).where(and(eq(lecture.schoolClassId, classId), eq(lecture.date, date)));
  const removed: number[] = [];
  const changed: { id?: number; period: number; subjectId: number; teacherId: number; topic: string }[] = [];
  for (const [period] of weekdayPeriods(isoWeekday(date))) {
    const topic = (values[`topic_${period}`] ?? "").trim().slice(0, 200);
    const subjectId = Number(values[`subject_${period}`]) || null;
    const teacherId = Number(values[`teacher_${period}`]) || null;
    const saved = existing.find((l) => l.period === period);
    if (!topic) {
      if (saved) removed.push(saved.id);
      continue;
    }
    if (!subjectId) errors[`subject_${period}`] = ["Informe a matéria."];
    if (!teacherId) errors[`teacher_${period}`] = ["Informe o professor."];
    if (!subjectId || !teacherId) continue;
    if (saved && saved.subjectId === subjectId && saved.teacherId === teacherId && saved.topic === topic) continue;
    const rowErrors = await lectureErrors(c, date, period, subjectId, teacherId);
    for (const [field, message] of Object.entries(rowErrors)) errors[`${field}_${period}`] = [message];
    if (!Object.keys(rowErrors).length) changed.push({ id: saved?.id, period, subjectId, teacherId, topic });
  }
  if (Object.keys(errors).length) return { errors, values, formError: "Corrija as aulas destacadas. Nenhuma aula foi salva." };
  try {
    await db.transaction(async (tx) => {
      for (const id of removed) await tx.delete(lecture).where(eq(lecture.id, id));
      for (const l of changed) {
        if (l.id) await tx.update(lecture).set({ subjectId: l.subjectId, teacherId: l.teacherId, topic: l.topic }).where(eq(lecture.id, l.id));
        else await tx.insert(lecture).values({ schoolClassId: classId, date, period: l.period, subjectId: l.subjectId, teacherId: l.teacherId, topic: l.topic });
      }
    });
  } catch (error) {
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    return { values, formError: TAKEN_BY_ANOTHER };
  }
  redirect(`/lessons/lectures/day?school_class=${classId}&date=${date}&msg=updated`);
}

const lectureSchema = z.object({ date: requiredDate, period: intField(1, 12), subjectId: foreignKey, teacherId: foreignKey, topic: requiredText(200) });

/** One lecture; the class stays (new lectures come from the day sheet). */
export async function updateLecture(id: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("lessons.edit");
  const [current] = await db.select().from(lecture).where(eq(lecture.id, id));
  if (!current) redirect("/lessons/lectures");
  const { data, values, state } = parseForm(lectureSchema, formData);
  if (!data) return state;
  const c = await seriesClass(current.schoolClassId);
  if (!c) redirect("/lessons/lectures");
  const errors = Object.fromEntries(
    Object.entries(await lectureErrors(c, data.date, data.period, data.subjectId, data.teacherId)).map(([f, m]) => [{ subject: "subjectId", teacher: "teacherId" }[f] ?? f, [m]]),
  );
  const [taken] = await db.select({ id: lecture.id }).from(lecture).where(and(eq(lecture.schoolClassId, current.schoolClassId), eq(lecture.date, data.date), eq(lecture.period, data.period), ne(lecture.id, id)));
  if (taken) errors.period = [PERIOD_TAKEN];
  if (Object.keys(errors).length) return { errors, values };
  try {
    await db.update(lecture).set(data).where(eq(lecture.id, id));
  } catch (error) {
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    return { errors: { period: [PERIOD_TAKEN] }, values };
  }
  redirect("/lessons/lectures?msg=updated");
}

export async function deleteLecture(id: number) {
  await requirePermission("lessons.edit");
  await deleteAndRedirect(() => db.delete(lecture).where(eq(lecture.id, id)), "/lessons/lectures");
}
