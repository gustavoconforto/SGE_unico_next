// Guardian portal logins and data scoping against the dev database (gestao-pg): a guardian sees only the
// students linked to them, and their login is a portal-only role tied to the guardian.
import "dotenv/config";
import { and, eq, inArray, isNotNull, ne } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  classesClass as klass,
  gradesGrade as grade,
  enrollmentsEnrollment as enrollment,
  portalAlert as alert,
  studentsGuardian as guardian,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { portalPushsubscription as pushSubscription, user } from "@/db/schema/auth";
import { applyLoginPlan, ownerLogin } from "@/lib/login";

vi.mock("server-only", () => ({}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));

const { portalAlerts, viewerEnrollmentYearStart, portalStudents } = await import("./data");
const { loadReportCard } = await import("../(app)/grades/report");
const { allLocks } = await import("@/lib/grade-lock");
const { alertSubscriptions } = await import("@/lib/push");

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("portal (guardians and students)", () => {
  const ids: number[] = [];
  const guardian0 = () => ({ kind: "guardian" as const, guardianId: ids[0] });
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
    await db.delete(user).where(eq(user.studentId, studentId)); // the student's test login (the student stays)
    if (alertIds.length) await db.delete(alert).where(inArray(alert.id, alertIds));
    if (!ids.length) return;
    await db.delete(link).where(inArray(link.guardianId, ids));
    await db.delete(guardian).where(inArray(guardian.id, ids)); // their logins go with them
  });

  it("lists only the guardian's own students", async () => {
    expect((await portalStudents(guardian0())).map((s) => s.id)).toEqual([studentId]);
    expect(await portalStudents({ kind: "guardian", guardianId: ids[1] })).toEqual([]);
  });

  it("opens grades only for an enrollment of the guardian's own student", async () => {
    expect(await viewerEnrollmentYearStart(guardian0(), enrollmentId)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    expect(await viewerEnrollmentYearStart({ kind: "guardian", guardianId: ids[1] }, enrollmentId)).toBeNull();
  });

  it("hides every grade the filter doesn't show (guardians: unlocked bimesters)", async () => {
    const [graded] = await db.select({ id: grade.enrollmentId }).from(grade).limit(1);
    const all = (await loadReportCard(graded.id))!;
    expect(all.rows.some((r) => r.bimesters.some((b) => b !== null))).toBe(true);
    const hidden = (await loadReportCard(graded.id, () => false))!;
    expect(hidden.rows.every((r) => r.bimesters.every((b) => b === null) && r.recovery === null)).toBe(true);
  });

  it("counts only locks made since the school year began", async () => {
    expect((await allLocks("2999-01-01")).size).toBe(0);
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
    const seen = (await portalAlerts([mine.id], 1000)).map((a) => a.id).filter((id) => alertIds.includes(id));
    expect(seen.sort()).toEqual([alertIds[0], alertIds[1]].sort());
    const none = (await portalAlerts([], 1000)).map((a) => a.id).filter((id) => alertIds.includes(id));
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

  it("shows a student only themself, and only their own enrollments' grades", async () => {
    const me = { kind: "student" as const, studentId };
    expect((await portalStudents(me)).map((s) => s.id)).toEqual([studentId]);
    expect(await viewerEnrollmentYearStart(me, enrollmentId)).toMatch(/^\d{4}-\d{2}-\d{2}$/);
    const [other] = await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .where(ne(enrollment.studentId, studentId))
      .limit(1);
    expect(await viewerEnrollmentYearStart(me, other.id)).toBeNull();
  });

  it("creates a student's portal login named by the matrícula, pushed to for their own class only", async () => {
    const [{ registration }] = await db
      .select({ registration: student.registration })
      .from(student)
      .where(eq(student.id, studentId));
    const input = { access: true, username: registration, password: "senha-inicial" };
    await applyLoginPlan("create", { studentId }, "Test Student", input, undefined);
    const login = (await ownerLogin({ studentId }))!;
    expect(login).toMatchObject({ username: registration, role: "aluno" });
    const endpoint = `https://fcm.googleapis.com/fcm/send/test-student-${cpf}`;
    await db.insert(pushSubscription).values({ userId: login.id, endpoint, p256dh: "k", auth: "a" });
    const [other] = await db.select({ id: klass.id }).from(klass).where(ne(klass.id, classId)).limit(1);
    const reaches = async (schoolClassId: number | null) =>
      (await alertSubscriptions(schoolClassId)).some((s) => s.endpoint === endpoint);
    expect(await reaches(null)).toBe(true);
    expect(await reaches(classId)).toBe(true);
    expect(await reaches(other.id)).toBe(false);
  });
});
