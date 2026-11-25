// The class roll call of one day: who is called, for which lessons, and what is saved.
import { and, asc, eq, exists, inArray, lte, or } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollmentsCalendarday as calendarDay,
  enrollmentsEnrollment as enrollment,
  lessonsAttendance as attendance,
  lessonsAttendancenote as attendanceNote,
  studentsStudent as student,
} from "@/db/schema/app";
import { attendanceDateError } from "@/lib/attendance";
import { isSchoolDay } from "@/lib/calendar";
import { today } from "@/lib/finance";
import { ref } from "@/lib/sql";
import { studentName } from "../../enrollments/data";
import { type SeriesClass, dayLessons, levelSubjects } from "../data";

/** Why the class's roll call can't be taken on `date`, or null. */
export async function rollCallDateError(c: SeriesClass, date: string) {
  const [day] = await db
    .select({ isSchoolDay: calendarDay.isSchoolDay })
    .from(calendarDay)
    .where(and(eq(calendarDay.schoolYearId, c.yearId), eq(calendarDay.day, date)));
  return attendanceDateError(date, c.begins, c.ends, isSchoolDay(day, date), today());
}

/**
 * The day's lessons that have a subject (the diary's lecture, else the timetable), the students called (active
 * enrollments of the class enrolled by then, plus anyone already called that day) and what was saved for them.
 */
export async function rollCall(c: SeriesClass, date: string) {
  const [lessons, subjects] = await Promise.all([dayLessons(c.id, date), levelSubjects(c.gradeLevel)]);
  const columns = lessons.flatMap(({ period, label, lecture, slot }) => {
    const subjectId = lecture?.subjectId ?? slot?.subjectId;
    return subjectId
      ? [{ period, label, subjectId, subject: subjects.find((s) => s.id === subjectId)?.name ?? "?" }]
      : [];
  });
  const students = await db
    .select({ id: enrollment.id, name: studentName })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(
      and(
        eq(enrollment.schoolClassId, c.id),
        or(
          and(eq(enrollment.status, "A"), lte(enrollment.enrolledAt, date)),
          exists(
            db
              .select({ id: attendance.id })
              .from(attendance)
              .where(and(eq(attendance.enrollmentId, ref(enrollment.id)), eq(attendance.date, date))),
          ),
        ),
      ),
    )
    .orderBy(asc(studentName));
  const ids = students.map((s) => s.id);
  const [saved, notes] = ids.length
    ? await Promise.all([
        db
          .select()
          .from(attendance)
          .where(and(inArray(attendance.enrollmentId, ids), eq(attendance.date, date))),
        db
          .select()
          .from(attendanceNote)
          .where(and(inArray(attendanceNote.enrollmentId, ids), eq(attendanceNote.date, date))),
      ])
    : [[], []];
  return { columns, students, saved, notes };
}
export type RollCall = Awaited<ReturnType<typeof rollCall>>;
