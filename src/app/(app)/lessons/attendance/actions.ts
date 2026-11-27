"use server";

import { and, eq, inArray, notInArray, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { lessonsAttendance as attendance, lessonsAttendancenote as attendanceNote } from "@/db/schema/app";
import { ATTENDANCE_NOTE_MAX, isAttendanceStatus } from "@/lib/attendance";
import { requirePermission } from "@/lib/authorization";
import type { FormState } from "@/lib/form";
import { formValues, requiredDate } from "@/lib/form";
import { seriesClass } from "../data";
import { rollCall, rollCallDateError } from "./data";

const CHANGED = "Os alunos ou as aulas do dia mudaram desde que a página abriu. Recarregue e confira a chamada.";
const NOT_TAKEN = "Não há chamada registrada para o aluno nesta data.";

/**
 * Saves the class's roll call of `date` (RollCallSheet): `status_<enrollment>_<period>` for each student and lesson,
 * `note_<enrollment>` per student. Lessons and students come from the day, not the form; last write wins.
 * With `enrollmentId` (excused absences) only that student's saved day is rewritten; other lessons are kept.
 */
export async function saveRollCall(
  classId: number,
  date: string,
  enrollmentId: number | null,
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  await requirePermission("attendance", "edit");
  const c = await seriesClass(classId);
  if (!c || !requiredDate.safeParse(date).success) redirect("/lessons/attendance");
  const values = formValues(formData);
  const dateError = await rollCallDateError(c, date);
  if (dateError) return { formError: dateError, values };
  const day = await rollCall(c, date);
  const { columns } = day;
  const students = enrollmentId ? day.students.filter((s) => s.id === enrollmentId) : day.students;
  if (enrollmentId && !day.saved.some((a) => a.enrollmentId === enrollmentId)) return { formError: NOT_TAKEN, values };
  if (!columns.length || !students.length) return { formError: CHANGED, values };
  const rows = students.flatMap((s) =>
    columns.map((l) => ({
      enrollmentId: s.id,
      date,
      period: l.period,
      subjectId: l.subjectId,
      status: values[`status_${s.id}_${l.period}`] ?? "",
    })),
  );
  if (!rows.every((r) => isAttendanceStatus(r.status))) return { formError: CHANGED, values };
  const notes = students.map((s) => ({
    enrollmentId: s.id,
    date,
    note: (values[`note_${s.id}`] ?? "").trim().slice(0, ATTENDANCE_NOTE_MAX),
  }));
  const ids = students.map((s) => s.id);
  const now = new Date().toISOString();
  await db.transaction(async (tx) => {
    if (!enrollmentId)
      await tx.delete(attendance).where(
        and(
          inArray(attendance.enrollmentId, ids),
          eq(attendance.date, date),
          notInArray(
            attendance.period,
            columns.map((l) => l.period),
          ),
        ),
      );
    await tx
      .insert(attendance)
      .values(rows)
      .onConflictDoUpdate({
        target: [attendance.enrollmentId, attendance.date, attendance.period],
        set: { subjectId: sql`excluded.subject_id`, status: sql`excluded.status`, updatedAt: now },
      });
    const written = notes.filter((n) => n.note);
    const blank = notes.filter((n) => !n.note).map((n) => n.enrollmentId);
    if (blank.length)
      await tx
        .delete(attendanceNote)
        .where(and(inArray(attendanceNote.enrollmentId, blank), eq(attendanceNote.date, date)));
    if (written.length)
      await tx
        .insert(attendanceNote)
        .values(written)
        .onConflictDoUpdate({
          target: [attendanceNote.enrollmentId, attendanceNote.date],
          set: { note: sql`excluded.note`, updatedAt: now },
        });
  });
  redirect(
    enrollmentId
      ? `/lessons/excused-absences?enrollment=${enrollmentId}&date=${date}&msg=updated`
      : `/lessons/attendance?school_class=${classId}&date=${date}&msg=updated`,
  );
}
