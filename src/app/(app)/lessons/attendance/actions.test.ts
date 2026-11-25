// saveRollCall against the dev database: saves a day's grid and notes, updates them on a second save, and refuses
// future days and a grid that no longer matches the day. Puts two timetable slots on the first seeded class with an
// active enrollment (and a series subject if it has none); afterwards removes what it saved and puts the class's
// own slots back.
import "dotenv/config";
import { and, asc, eq, inArray } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  classesClass as klass,
  employeesEmployee as employee,
  enrollmentsEnrollment as enrollment,
  enrollmentsSchoolyear as year,
  gradesGradelevelsubject as levelSubject,
  gradesSubject as subject,
  lessonsAttendance as attendance,
  lessonsAttendancenote as attendanceNote,
  lessonsTimetableslot as slot,
} from "@/db/schema/app";
import { addDays, isoWeekday } from "@/lib/dates";
import { saveRollCall } from "./actions";

vi.mock("@/lib/authorization", () => ({
  requirePermission: async () => ({ user: { role: "admin" } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));
let now = "2099-12-31";
vi.mock("@/lib/finance", async (original) => ({
  ...(await original<typeof import("@/lib/finance")>()),
  today: () => now,
}));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

const form = (fields: Record<string, string>) => {
  const f = new FormData();
  for (const [k, v] of Object.entries(fields)) f.set(k, v);
  return f;
};

describe.skipIf(!local)("saveRollCall", async () => {
  const [found] = local
    ? await db
        .select({ classId: klass.id, gradeLevel: klass.gradeLevel, ends: year.ends })
        .from(klass)
        .innerJoin(year, eq(klass.yearId, year.id))
        .innerJoin(enrollment, and(eq(enrollment.schoolClassId, klass.id), eq(enrollment.status, "A")))
        .orderBy(asc(klass.id))
        .limit(1)
    : [];
  const [teacher] = local ? await db.select({ id: employee.id }).from(employee).limit(1) : [];
  const [anySubject] = local ? await db.select({ id: subject.id }).from(subject).limit(1) : [];
  const ready = !!(found?.gradeLevel && teacher && anySubject);
  const classId = found?.classId ?? 0;
  let date = found?.ends ?? "";
  while (ready && isoWeekday(date) !== 1) date = addDays(date, -1);
  const [existing] = ready
    ? await db.select().from(levelSubject).where(eq(levelSubject.gradeLevel, found.gradeLevel!)).limit(1)
    : [];
  const [created] =
    ready && !existing
      ? await db.insert(levelSubject).values({ gradeLevel: found.gradeLevel!, subjectId: anySubject.id }).returning()
      : [];
  const levelSubjectId = (existing ?? created)?.id;
  const students = ready
    ? await db
        .select({ id: enrollment.id })
        .from(enrollment)
        .where(and(eq(enrollment.schoolClassId, classId), eq(enrollment.status, "A")))
    : [];
  const ids = students.map((s) => s.id);
  const mondayFirstTwo = and(eq(slot.schoolClassId, classId), eq(slot.weekday, 1), inArray(slot.period, [1, 2]));
  const kept = ready ? await db.select().from(slot).where(mondayFirstTwo) : [];
  if (ready) {
    await db.delete(slot).where(mondayFirstTwo);
    await db.insert(slot).values(
      [1, 2].map((period) => ({
        schoolClassId: classId,
        weekday: 1,
        period,
        subjectId: levelSubjectId!,
        teacherId: teacher.id,
      })),
    );
  }
  afterAll(async () => {
    if (!ready) return;
    await db.delete(attendance).where(and(inArray(attendance.enrollmentId, ids), eq(attendance.date, date)));
    await db
      .delete(attendanceNote)
      .where(and(inArray(attendanceNote.enrollmentId, ids), eq(attendanceNote.date, date)));
    await db.delete(slot).where(mondayFirstTwo);
    if (kept.length) await db.insert(slot).values(kept);
    if (created) await db.delete(levelSubject).where(eq(levelSubject.id, created.id));
  });

  const grid = (status: (id: number, period: number) => string, notes: Record<number, string> = {}) =>
    form(
      Object.fromEntries(
        ids.flatMap((id) => [
          [`status_${id}_1`, status(id, 1)],
          [`status_${id}_2`, status(id, 2)],
          [`note_${id}`, notes[id] ?? ""],
        ]),
      ),
    );
  const saved = () =>
    db
      .select({ enrollmentId: attendance.enrollmentId, period: attendance.period, status: attendance.status })
      .from(attendance)
      .where(and(inArray(attendance.enrollmentId, ids), eq(attendance.date, date)))
      .orderBy(asc(attendance.enrollmentId), asc(attendance.period));
  const notes = () =>
    db
      .select({ enrollmentId: attendanceNote.enrollmentId, note: attendanceNote.note })
      .from(attendanceNote)
      .where(and(inArray(attendanceNote.enrollmentId, ids), eq(attendanceNote.date, date)));

  it.skipIf(!ready)("saves every student's status per lesson and the day's notes", async () => {
    const first = ids[0];
    await expect(
      saveRollCall(
        classId,
        date,
        {},
        grid((id, p) => (id === first && p === 2 ? "F" : "P"), { [first]: " saiu às 10h " }),
      ),
    ).rejects.toThrow(`REDIRECT /lessons/attendance?school_class=${classId}&date=${date}&msg=updated`);
    expect(await saved()).toEqual(
      ids.flatMap((id) => [
        { enrollmentId: id, period: 1, status: "P" },
        { enrollmentId: id, period: 2, status: id === first ? "F" : "P" },
      ]),
    );
    expect(await notes()).toEqual([{ enrollmentId: first, note: "saiu às 10h" }]);
  });

  it.skipIf(!ready)("updates on a second save and drops a cleared note", async () => {
    await expect(
      saveRollCall(
        classId,
        date,
        {},
        grid(() => "J"),
      ),
    ).rejects.toThrow("msg=updated");
    expect((await saved()).every((r) => r.status === "J")).toBe(true);
    expect(await notes()).toEqual([]);
  });

  it.skipIf(!ready)("refuses a grid missing a student's lesson or with an unknown status", async () => {
    const missing = grid(() => "P");
    missing.delete(`status_${ids[0]}_2`);
    expect((await saveRollCall(classId, date, {}, missing)).formError).toMatch(/mudaram/);
    expect(
      (
        await saveRollCall(
          classId,
          date,
          {},
          grid(() => "X"),
        )
      ).formError,
    ).toMatch(/mudaram/);
    expect((await saved()).every((r) => r.status === "J")).toBe(true);
  });

  it.skipIf(!ready)("refuses a day after today", async () => {
    now = addDays(date, -1);
    try {
      expect(
        (
          await saveRollCall(
            classId,
            date,
            {},
            grid(() => "P"),
          )
        ).formError,
      ).toBe("A chamada só pode ser feita até o dia de hoje.");
    } finally {
      now = "2099-12-31";
    }
  });
});
