// Guardian portal logins and data scoping against the dev database (gestao-pg): a guardian sees only the
// students linked to them, and their login is a portal-only role tied to the guardian.
import "dotenv/config";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  portalAlert as alert,
  studentsGuardian as guardian,
  studentsGuardianassociation as link,
} from "@/db/schema/app";
import { portalPushsubscription as pushSubscription, user } from "@/db/schema/auth";
import { applyLoginPlan, ownerLogin } from "@/lib/login";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { guardianAlerts, guardianStudents, isGuardianEnrollment } = await import("./data");
const { alertSubscriptions } = await import("@/lib/push");

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("guardian portal", () => {
  const ids: number[] = [];
  const alertIds: number[] = [];
  let studentId: number;
  let classId: number;
  let enrollmentId: number;
  const cpf = String(Date.now()).slice(-11).padStart(11, "9");

  beforeAll(async () => {
    const [placed] = await db
      .select({ id: enrollment.id, studentId: enrollment.studentId, classId: enrollment.schoolClassId })
      .from(enrollment)
      .where(and(eq(enrollment.status, "A"), isNotNull(enrollment.schoolClassId)))
      .limit(1);
    studentId = placed.studentId;
    classId = placed.classId!;
    enrollmentId = placed.id;
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
    if (alertIds.length) await db.delete(alert).where(inArray(alert.id, alertIds));
    if (!ids.length) return;
    await db.delete(link).where(inArray(link.guardianId, ids));
    await db.delete(guardian).where(inArray(guardian.id, ids)); // their logins go with them
  });

  it("lists only the guardian's own students", async () => {
    expect((await guardianStudents(ids[0])).map((s) => s.id)).toEqual([studentId]);
    expect(await guardianStudents(ids[1])).toEqual([]);
  });

  it("opens grades only for an enrollment of the guardian's own student", async () => {
    expect(await isGuardianEnrollment(ids[0], enrollmentId)).toBe(true);
    expect(await isGuardianEnrollment(ids[1], enrollmentId)).toBe(false);
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

  it("shows notices for every guardian or for the guardian's classes, never another class's", async () => {
    const [mine, other] = await db.select({ id: klass.id }).from(klass).limit(2);
    const rows = await db
      .insert(alert)
      .values([
        { title: "Test todos", body: "x", schoolClassId: null },
        { title: "Test minha turma", body: "x", schoolClassId: mine.id },
        { title: "Test outra turma", body: "x", schoolClassId: other.id },
      ])
      .returning({ id: alert.id });
    alertIds.push(...rows.map((r) => r.id));
    const seen = (await guardianAlerts([mine.id], 1000)).map((a) => a.id).filter((id) => alertIds.includes(id));
    expect(seen.sort()).toEqual([alertIds[0], alertIds[1]].sort());
    const none = (await guardianAlerts([], 1000)).map((a) => a.id).filter((id) => alertIds.includes(id));
    expect(none).toEqual([alertIds[0]]);
  });

  it("pushes to the guardian's devices for school-wide notices and their student's class only", async () => {
    const login = (await ownerLogin({ guardianId: ids[0] }))!;
    const endpoint = `https://fcm.googleapis.com/fcm/send/test-${cpf}`;
    await db.insert(pushSubscription).values({ userId: login.id, endpoint, p256dh: "k", auth: "a" });
    const [other] = await db.select({ id: klass.id }).from(klass).where(ne(klass.id, classId)).limit(1);
    const reaches = async (schoolClassId: number | null) =>
      (await alertSubscriptions(schoolClassId)).some((s) => s.endpoint === endpoint);
    expect(await reaches(null)).toBe(true);
    expect(await reaches(classId)).toBe(true);
    expect(await reaches(other.id)).toBe(false);
  });
});
