// Guardian portal logins and data scoping against the dev database (gestao-pg): a guardian sees only the
// students linked to them, and their login is a portal-only role tied to the guardian.
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  studentsGuardian as guardian,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { user } from "@/db/schema/auth";
import { applyLoginPlan, ownerLogin } from "@/lib/login";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { guardianStudents } = await import("./data");

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("guardian portal", () => {
  const ids: number[] = [];
  let studentId: number;
  const cpf = String(Date.now()).slice(-11).padStart(11, "9");

  beforeAll(async () => {
    [{ id: studentId }] = await db.select({ id: student.id }).from(student).limit(1);
    const blank = {
      sex: "F",
      issuingAuthority: "",
      nationality: "",
      placeOfBirth: "",
      phone: "",
      mobile: "",
      email: "",
      address: "",
      neighborhood: "",
      city: "",
      state: "",
      zipCode: "",
      maritalStatus: "",
    };
    const rows = await db
      .insert(guardian)
      .values([
        { ...blank, name: "Test Portal Linked", cpf, rg: `a${cpf}` },
        { ...blank, name: "Test Portal Other", cpf: "", rg: `b${cpf}` },
      ])
      .returning({ id: guardian.id });
    ids.push(...rows.map((r) => r.id));
    await db.insert(link).values({
      guardianId: ids[0],
      studentId,
      relationship: "OUT",
      isFinancial: false,
      isPrimaryContact: false,
      livingWith: false,
      pickUp: false,
    });
  });

  afterAll(async () => {
    if (!ids.length) return;
    await db.delete(link).where(inArray(link.guardianId, ids));
    await db.delete(guardian).where(inArray(guardian.id, ids)); // their logins go with them
  });

  it("lists only the guardian's own students", async () => {
    expect((await guardianStudents(ids[0])).map((s) => s.id)).toEqual([studentId]);
    expect(await guardianStudents(ids[1])).toEqual([]);
  });

  it("creates a portal login named by the CPF, with no staff role, that must change its password", async () => {
    const input = { access: true, username: cpf, password: "senha-inicial" };
    await applyLoginPlan("create", { guardianId: ids[0] }, "Test Portal Linked", input, undefined);
    const login = (await ownerLogin({ guardianId: ids[0] }))!;
    expect(login).toMatchObject({ username: cpf, role: "responsavel" });
    const [row] = await db
      .select({ employeeId: user.employeeId, mustChange: user.mustChangePassword })
      .from(user)
      .where(eq(user.id, login.id));
    expect(row).toEqual({ employeeId: null, mustChange: true });
  });
});
