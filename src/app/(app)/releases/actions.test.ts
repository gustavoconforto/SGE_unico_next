// saveBatchExits against the dev database: saves one exit per checked student, skips repeats, rejects students
// who aren't active in the chosen school year. Uses its own motive and removes it (and its exits) afterwards.
import "dotenv/config";
import { and, eq, not } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  releasesEarlyexit as exit,
  releasesExitreason as reason,
} from "@/db/schema/app";
import { saveBatchExits } from "./actions";

vi.mock("@/lib/authorization", () => ({
  requirePermission: async () => ({ user: { role: "admin" } }),
  hasPermission: async () => true,
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");
const DATE = "2000-01-03";

describe.skipIf(!local)("saveBatchExits", async () => {
  const active = local
    ? await db
        .select({ id: enrollment.id, year: enrollmentType.schoolYearId })
        .from(enrollment)
        .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
        .where(eq(enrollment.status, "A"))
        .limit(2)
    : [];
  const year = active[0]?.year;
  const [other] =
    local && year
      ? await db
          .select({ id: enrollment.id })
          .from(enrollment)
          .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
          .where(not(and(eq(enrollment.status, "A"), eq(enrollmentType.schoolYearId, year))!))
          .limit(1)
      : [];
  const [{ id: reasonId }] = local
    ? await db
        .insert(reason)
        .values({ reason: `teste ${Date.now()}` })
        .returning({ id: reason.id })
    : [{ id: 0 }];

  afterAll(async () => {
    if (!local) return;
    await db.delete(exit).where(eq(exit.reasonId, reasonId));
    await db.delete(reason).where(eq(reason.id, reasonId));
  });

  const save = (ids: number[]) => {
    const f = new FormData();
    f.set("exitDate", DATE);
    // Any valid id when the dev database has no active enrollment: the empty-selection case never reads it
    f.set("schoolYearId", String(year ?? 1));
    f.set("reasonId", String(reasonId));
    for (const id of ids) f.append("enrollmentId", String(id));
    return saveBatchExits({}, f).catch((e: Error) => e.message);
  };
  const saved = async () =>
    (await db.select({ id: exit.enrollmentId }).from(exit).where(eq(exit.reasonId, reasonId))).map((r) => r.id).sort();
  const sameYear = active.filter((a) => a.year === year).map((a) => a.id);

  it.skipIf(!sameYear.length)("saves one exit per student, and skips the ones already saved", async () => {
    expect(await save(sameYear)).toMatch(/^REDIRECT \/releases\?.*msg=releases_created/);
    expect(await save(sameYear)).toMatch(/^REDIRECT/);
    expect(await saved()).toEqual([...sameYear].sort());
  });

  it("asks for at least one student", async () => {
    expect(await save([])).toEqual({ formError: "Selecione ao menos um aluno.", values: expect.any(Object) });
  });

  it.skipIf(!other)("saves nothing when a student isn't active in that school year", async () => {
    const before = await saved();
    expect(await save([sameYear[0], other.id])).toMatchObject({
      formError: expect.stringContaining("matrícula ativa"),
    });
    expect(await saved()).toEqual(before);
  });
});
