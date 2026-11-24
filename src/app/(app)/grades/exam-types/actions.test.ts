// saveExamType against the dev database: an exam type's kind is locked once it has grades.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { gradesExamtype as examType, gradesGrade as grade } from "@/db/schema/app";
import { saveExamType } from "./actions";

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

describe.skipIf(!local)("saveExamType", () => {
  const save = (id: number, t: { name: string; code: string; kind: string; maxScore: string; order: number }) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ ...t, maxScore: t.maxScore.replace(".", ",") })) f.set(k, String(v));
    return saveExamType(id, {}, f).catch((e: Error) => e.message);
  };

  it("refuses to change the kind of a type with grades", async () => {
    const [used] = await db
      .select({ t: examType })
      .from(examType)
      .innerJoin(grade, eq(grade.examTypeId, examType.id))
      .limit(1);
    if (!used) return;
    const t = used.t;
    expect(await save(t.id, { ...t, kind: t.kind === "B" ? "R" : "B" })).toMatchObject({
      errors: { kind: [expect.any(String)] },
    });
    expect((await db.select({ kind: examType.kind }).from(examType).where(eq(examType.id, t.id)))[0].kind).toBe(t.kind);
  });

  it("changes the kind of a type without grades", async () => {
    const [t] = await db
      .insert(examType)
      .values({ name: "Teste de tipo", code: "ZZ", kind: "R", maxScore: "1.00", order: 99 })
      .returning();
    try {
      expect(await save(t.id, { ...t, kind: "A" })).toMatch(/^REDIRECT/);
      expect((await db.select({ kind: examType.kind }).from(examType).where(eq(examType.id, t.id)))[0].kind).toBe("A");
    } finally {
      await db.delete(examType).where(eq(examType.id, t.id));
    }
  });
});
