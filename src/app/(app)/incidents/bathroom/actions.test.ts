// saveBatchRecords against the dev database: a class grid saves one pass per cell, only for the class's active students.
import "dotenv/config";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, incidentsBathroompermission as pass } from "@/db/schema/app";
import { saveBatchRecords } from "./actions";

vi.mock("@/lib/authorization", () => ({ requirePermission: async () => ({ user: { role: "admin" } }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
const DATE = "1999-01-04";

describe.skipIf(!local)("saveBatchRecords (bathroom)", async () => {
  const enrolled = (where: ReturnType<typeof and>) =>
    db
      .select({ id: enrollment.id, classId: enrollment.schoolClassId })
      .from(enrollment)
      .where(and(isNotNull(enrollment.schoolClassId), where))
      .limit(2);
  const [a, b] = local ? await enrolled(eq(enrollment.status, "A")) : [];
  const [other] = a ? await enrolled(and(eq(enrollment.status, "A"), ne(enrollment.schoolClassId, a.classId!))) : [];
  const ids = [a, b, other].filter(Boolean).map((e) => e!.id);
  const saved = () =>
    db
      .select({ enrollmentId: pass.enrollmentId, classPeriod: pass.classPeriod })
      .from(pass)
      .where(and(eq(pass.incidentDate, DATE), inArray(pass.enrollmentId, ids)));
  const save = (classId: number, cells: string[]) => {
    const f = new FormData();
    f.set("incidentDate", DATE);
    f.set("schoolClassId", String(classId));
    for (const c of cells) f.append("cell", c);
    return saveBatchRecords({}, f).catch((e: Error) => e.message);
  };

  afterAll(async () => {
    if (ids.length) await db.delete(pass).where(and(eq(pass.incidentDate, DATE), inArray(pass.enrollmentId, ids)));
  });

  it.skipIf(!a)("saves one pass per checked cell", async () => {
    expect(await save(a!.classId!, [`${a!.id}:1`, `${a!.id}:7`])).toBe(
      "REDIRECT /incidents/bathroom?msg=bathroom_created",
    );
    expect(await saved()).toEqual(
      expect.arrayContaining([
        { enrollmentId: a!.id, classPeriod: 1 },
        { enrollmentId: a!.id, classPeriod: 7 },
      ]),
    );
  });

  it.skipIf(!a || !other)("refuses a student from another class and saves nothing", async () => {
    const before = (await saved()).length;
    expect(await save(a!.classId!, [`${a!.id}:2`, `${other!.id}:2`])).toMatchObject({
      formError: expect.stringContaining("nesta turma"),
    });
    expect(await saved()).toHaveLength(before);
  });

  it.skipIf(!b)("refuses an enrollment that is no longer active", async () => {
    await db.update(enrollment).set({ status: "C" }).where(eq(enrollment.id, b!.id));
    try {
      expect(await save(b!.classId!, [`${b!.id}:3`])).toMatchObject({
        formError: expect.stringContaining("matrícula ativa"),
      });
    } finally {
      await db.update(enrollment).set({ status: "A" }).where(eq(enrollment.id, b!.id));
    }
  });

  it.skipIf(!a)("refuses a period past the grid", async () => {
    expect(await save(a!.classId!, [`${a!.id}:8`])).toMatchObject({ formError: expect.stringContaining("inválido") });
  });
});
