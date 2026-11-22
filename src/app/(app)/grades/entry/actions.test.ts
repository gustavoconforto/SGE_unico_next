// saveGradeSheet against the dev database: one sheet save inserts, updates and deletes grades in batches.
// Uses the first seeded class sheet it finds and puts its grades back afterwards.
import "dotenv/config";
import { and, eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { classesClass as klass, enrollmentsEnrollment as enrollment, gradesGrade as grade, gradesGradelevelsubject as levelSubject } from "@/db/schema/app";
import { SHEET_CHANGED, shownName, takenCell } from "../score";
import { saveGradeSheet } from "./actions";
import { cellName, loadSheet } from "./sheet";

vi.mock("@/lib/authorization", () => ({ requirePermission: async () => ({ user: { role: "admin" } }), hasPermission: async () => true }));
vi.mock("next/cache", () => ({ refresh: () => {} }));
// Runs once right after the action loads the sheet: another person saving in between
let afterLoad: (() => Promise<unknown>) | null = null;
vi.mock("./sheet", async (original) => {
  const m = await original<typeof import("./sheet")>();
  return {
    ...m,
    loadSheet: async (...args: Parameters<typeof m.loadSheet>) => {
      const sheet = await m.loadSheet(...args);
      const hook = afterLoad;
      afterLoad = null;
      if (hook) await hook();
      return sheet;
    },
  };
});
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

  const cells = () => {
    const row = sheet!.rows[0].id;
    const [ta, tb] = sheet!.examTypes;
    return { row, ta, tb, a: cellName(row, ta.id), b: cellName(row, tb.id) };
  };
  const save = (values: Record<string, string>) => {
    const f = new FormData();
    for (const [k, v] of Object.entries(values)) f.set(k, v);
    return saveGradeSheet({ query: "q", classId: found!.classId, subjectId: found!.subjectId, period: PERIOD }, {}, f).catch((e: Error) => e.message);
  };
  const scores = async () => Object.fromEntries((await db.select({ t: grade.examTypeId, s: grade.score }).from(grade).where(mine())).map((g) => [g.t, g.s]));
  const twoExams = !sheet?.rows.length || (sheet?.examTypes.length ?? 0) < 2;

  it.skipIf(twoExams)("inserts, updates and deletes in one save", async () => {
    await db.delete(grade).where(mine());
    const { ta, tb, a, b } = cells();

    expect(await save({ [a]: "0,5", [b]: "0,25" })).toMatchObject({ saved: expect.any(Number), count: 2 });
    expect(await scores()).toEqual({ [ta.id]: "0.50", [tb.id]: "0.25" });

    expect(await save({ [a]: "0,75", [shownName(a)]: "0,50", [b]: "", [shownName(b)]: "0,25" })).toMatchObject({ saved: expect.any(Number), count: 2 });
    expect(await scores()).toEqual({ [ta.id]: "0.75" });
  });

  it.skipIf(twoExams)("keeps the user's values when someone else saved the same grade meanwhile", async () => {
    await db.delete(grade).where(mine());
    const { row, ta, a, b } = cells();
    afterLoad = () => db.insert(grade).values({ enrollmentId: row, subjectId: found!.subjectId, examTypeId: ta.id, bimester: PERIOD, score: "0.40" });
    expect(await save({ [a]: "0,5", [b]: "0,25" })).toMatchObject({ formError: SHEET_CHANGED, errors: { [a]: [takenCell("0.40")] }, values: { [a]: "0,5" } });
    expect(await scores()).toEqual({ [ta.id]: "0.40" });
  });
});
