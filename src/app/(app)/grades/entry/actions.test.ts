// saveGradeSheet against the dev database: one sheet save inserts, updates and deletes grades in batches.
// Uses the first seeded class sheet it finds and puts its grades back afterwards.
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { classesClass as klass, enrollmentsEnrollment as enrollment, gradesGrade as grade, gradesGradelevelsubject as levelSubject } from "@/db/schema/app";
import { shownName } from "../score";
import { saveGradeSheet } from "./actions";
import { cellName, loadSheet } from "./sheet";

vi.mock("@/lib/session", () => ({ requireSession: async () => ({}) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
const PERIOD = 4;

describe.skipIf(!local)("saveGradeSheet", async () => {
  const [found] = local
    ? await db
        .select({ classId: klass.id, subjectId: levelSubject.subjectId })
        .from(klass)
        .innerJoin(levelSubject, eq(levelSubject.gradeLevel, klass.gradeLevel))
        .innerJoin(enrollment, and(eq(enrollment.schoolClassId, klass.id), eq(enrollment.status, "A")))
        .limit(1)
    : [];
  const sheet = found && (await loadSheet(found.classId, found.subjectId, PERIOD));
  let before: (typeof grade.$inferSelect)[] = [];
  const mine = () => and(inArray(grade.enrollmentId, sheet!.rows.map((r) => r.id)), eq(grade.subjectId, found!.subjectId), eq(grade.bimester, PERIOD));

  beforeAll(async () => {
    if (sheet) before = await db.select().from(grade).where(mine());
  });
  afterAll(async () => {
    if (!sheet) return;
    await db.delete(grade).where(mine());
    if (before.length) await db.insert(grade).values(before);
  });

  it.skipIf(!sheet?.rows.length || (sheet?.examTypes.length ?? 0) < 2)("inserts, updates and deletes in one save", async () => {
    await db.delete(grade).where(mine());
    const row = sheet!.rows[0].id;
    const [ta, tb] = sheet!.examTypes;
    const [a, b] = [cellName(row, ta.id), cellName(row, tb.id)];
    const save = (cells: Record<string, string>) => {
      const f = new FormData();
      for (const [k, v] of Object.entries(cells)) f.set(k, v);
      return saveGradeSheet({ query: "q", classId: found!.classId, subjectId: found!.subjectId, period: PERIOD }, {}, f).catch((e: Error) => e.message);
    };
    const scores = async () => Object.fromEntries((await db.select({ t: grade.examTypeId, s: grade.score }).from(grade).where(mine())).map((g) => [g.t, g.s]));

    expect(await save({ [a]: "0,5", [b]: "0,25" })).toMatch(/^REDIRECT/);
    expect(await scores()).toEqual({ [ta.id]: "0.50", [tb.id]: "0.25" });

    expect(await save({ [a]: "0,75", [shownName(a)]: "0,50", [b]: "", [shownName(b)]: "0,25" })).toMatch(/^REDIRECT/);
    expect(await scores()).toEqual({ [ta.id]: "0.75" });
  });
});
