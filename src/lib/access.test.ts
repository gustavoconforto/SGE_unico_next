import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import { accessGroup as group, accessGroupPermissions as groupPermission, accessGroupRoles as groupRole, employeesEmployee as employee, employeesEmployeeroletype as role } from "@/db/schema/app";
import { hasPermission, userAccess } from "./access";

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("userAccess", () => {
  let roleIds: number[] = [];
  let groupIds: number[] = [];
  let teacherId: number;
  let clerkId: number;
  const stamp = String(Date.now()).slice(-10);

  beforeAll(async () => {
    const [teacherRole, clerkRole] = await db.insert(role).values([{ role: "test-teacher" }, { role: "test-clerk" }]).returning({ id: role.id });
    roleIds = [teacherRole.id, clerkRole.id];
    const blank = { sex: "M", issuingAuthority: "", nationality: "", placeOfBirth: "", phone: "", mobile: "", email: "", address: "", neighborhood: "", city: "", state: "", zipCode: "", canAccessSuga: false, passwordSuga: "" };
    [{ id: teacherId }, { id: clerkId }] = await db
      .insert(employee)
      .values([
        { ...blank, name: "Test Teacher", cpf: `${stamp}1`, rg: `a${stamp}1`, roleId: teacherRole.id },
        { ...blank, name: "Test Clerk", cpf: `${stamp}2`, rg: `a${stamp}2`, roleId: clerkRole.id },
      ])
      .returning({ id: employee.id });
    // Two groups share the teacher's role: their permissions add up
    const [grades, lessons] = await db.insert(group).values([{ name: `test-grades-${stamp}` }, { name: `test-lessons-${stamp}` }]).returning({ id: group.id });
    groupIds = [grades.id, lessons.id];
    await db.insert(groupRole).values([
      { groupId: grades.id, roleId: teacherRole.id },
      { groupId: lessons.id, roleId: teacherRole.id },
    ]);
    await db.insert(groupPermission).values([
      { groupId: grades.id, codename: "grades.view" },
      { groupId: grades.id, codename: "grades.edit" },
      { groupId: lessons.id, codename: "lessons.view" },
      { groupId: lessons.id, codename: "grades.view" },
    ]);
  });

  afterAll(async () => {
    if (!roleIds.length) return;
    await db.delete(group).where(inArray(group.id, groupIds)); // links cascade
    await db.delete(employee).where(inArray(employee.roleId, roleIds));
    await db.delete(role).where(inArray(role.id, roleIds));
  });

  it("gives an employee the permissions of every group holding their role", async () => {
    const access = await userAccess({ role: "user", employeeId: teacherId });
    expect([...access.granted].sort()).toEqual(["grades.edit", "grades.view", "lessons.view"]);
    const teacher = { role: "user", employeeId: teacherId };
    expect(await hasPermission(teacher, "grades.edit")).toBe(true);
    expect(await hasPermission(teacher, "grades.manage")).toBe(false);
  });

  it("gives nothing to a role in no group, or to a login with no employee", async () => {
    expect((await userAccess({ role: "user", employeeId: clerkId })).granted.size).toBe(0);
    expect(await hasPermission({ role: "user", employeeId: null }, "students.view")).toBe(false);
  });

  it("gives admins everything", async () => {
    expect(await hasPermission({ role: "admin", employeeId: clerkId }, "groups.manage")).toBe(true);
  });

  it("drops a role's links when its group goes", async () => {
    const [temp] = await db.insert(group).values({ name: `test-temp-${stamp}` }).returning({ id: group.id });
    await db.insert(groupRole).values({ groupId: temp.id, roleId: roleIds[1] });
    await db.delete(group).where(eq(group.id, temp.id));
    expect(await db.select().from(groupRole).where(eq(groupRole.groupId, temp.id))).toEqual([]);
  });
});
