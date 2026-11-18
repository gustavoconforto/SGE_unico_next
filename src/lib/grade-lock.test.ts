import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { departmentsDepartment as department, departmentsDepartmentTeachers as departmentTeacher, employeesEmployee as employee, employeesEmployeeroletype as role } from "@/db/schema/app";
import { LOCKED, STAFF_ONLY, gradeEditError, isStaff } from "./grade-lock";

describe("gradeEditError", () => {
  it("lets staff edit anything, locked or staff-only", () => {
    for (const code of ["PS", "C", "EX", "A"]) {
      expect(gradeEditError(true, true, code)).toBeNull();
      expect(gradeEditError(true, false, code)).toBeNull();
    }
  });

  it("lets a teacher edit a regular grade while the bimester is open", () => {
    expect(gradeEditError(false, false, "PS")).toBeNull();
  });

  it("blocks a teacher on a locked bimester", () => {
    expect(gradeEditError(false, true, "PB")).toBe(LOCKED);
  });

  it("never lets a teacher edit concept, extra or adjustment grades", () => {
    for (const code of ["C", "EX", "A"]) expect(gradeEditError(false, false, code)).toBe(STAFF_ONLY);
  });
});

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("isStaff", () => {
  let roleId: number;
  let departmentId: number;
  let teacherId: number;
  let clerkId: number;
  const stamp = String(Date.now()).slice(-10);

  beforeAll(async () => {
    [{ id: roleId }] = await db.insert(role).values({ role: "test-staff" }).returning({ id: role.id });
    [{ id: departmentId }] = await db.insert(department).values({ name: `test-staff-${Date.now()}` }).returning({ id: department.id });
    const blank = { sex: "M", issuingAuthority: "", nationality: "", placeOfBirth: "", phone: "", mobile: "", email: "", address: "", neighborhood: "", city: "", state: "", zipCode: "", roleId, canAccessSuga: false, passwordSuga: "" };
    [{ id: teacherId }, { id: clerkId }] = await db
      .insert(employee)
      .values([
        // cpf and rg are unique even when blank
        { ...blank, name: "Test Teacher", cpf: `${stamp}1`, rg: `t${stamp}1` },
        { ...blank, name: "Test Clerk", cpf: `${stamp}2`, rg: `t${stamp}2` },
      ])
      .returning({ id: employee.id });
    await db.insert(departmentTeacher).values({ departmentId, employeeId: teacherId });
  });

  afterAll(async () => {
    if (roleId === undefined) return;
    await db.delete(departmentTeacher).where(eq(departmentTeacher.departmentId, departmentId));
    await db.delete(department).where(eq(department.id, departmentId));
    await db.delete(employee).where(eq(employee.roleId, roleId));
    await db.delete(role).where(eq(role.id, roleId));
  });

  it("treats admins and logins without an employee as staff", async () => {
    expect(await isStaff({ role: "admin", employeeId: teacherId })).toBe(true);
    expect(await isStaff({ role: "user", employeeId: null })).toBe(true);
  });

  it("treats a department teacher as a teacher, and a non-teaching employee as staff", async () => {
    expect(await isStaff({ role: "user", employeeId: teacherId })).toBe(false);
    expect(await isStaff({ role: "user", employeeId: clerkId })).toBe(true);
  });
});
