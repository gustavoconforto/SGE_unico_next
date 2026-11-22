// Employee logins against the dev database (gestao-pg): a reset signs the user out and forces a new password,
// and deleting the employee (which deletes the login by FK cascade) is for another admin only.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { employeesEmployee as employee, employeesEmployeeroletype as role } from "@/db/schema/app";
import { session as sessionTable, user } from "@/db/schema/auth";
import { applyLoginPlan, employeeLogin } from "@/lib/employee-login";
import { deleteEmployee, saveEmployee } from "./actions";

const caller = vi.hoisted(() => ({ user: { id: "", role: "user" } }));
// A caller holding employees.edit: the login and role rules are under test
vi.mock("@/lib/authorization", () => ({ requirePermission: async () => caller }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("employee logins", () => {
  let roleId: number;
  let employeeId: number;
  const username = `t${Date.now()}`;
  const input = { access: true, admin: false, username, password: "senha-inicial" };
  const del = () => deleteEmployee(employeeId).catch((e: Error) => e.message);

  beforeAll(async () => {
    [{ id: roleId }] = await db.insert(role).values({ role: "test-login" }).returning({ id: role.id });
    const blank = { sex: "M", cpf: "", rg: "", issuingAuthority: "", nationality: "", placeOfBirth: "", phone: "", mobile: "", email: "", address: "", neighborhood: "", city: "", state: "", zipCode: "" };
    [{ id: employeeId }] = await db
      .insert(employee)
      .values({ ...blank, name: "Test Login", roleId, canAccessSuga: false, passwordSuga: "" })
      .returning({ id: employee.id });
  });

  afterAll(async () => {
    if (roleId === undefined) return;
    await db.delete(employee).where(eq(employee.roleId, roleId)); // its login goes with it
    await db.delete(role).where(eq(role.id, roleId));
  });

  const flag = async (id: string) => (await db.select({ f: user.mustChangePassword }).from(user).where(eq(user.id, id)))[0].f;

  it("creates a login that must change its password, and a reset signs it out", async () => {
    await applyLoginPlan("create", { id: employeeId, name: "Test Login" }, input, undefined);
    const login = (await employeeLogin(employeeId))!;
    expect(login).toMatchObject({ username, role: "user" });
    expect(await flag(login.id)).toBe(true);

    // The employee changed the password and has a session; then an admin resets it
    await db.update(user).set({ mustChangePassword: false }).where(eq(user.id, login.id));
    await db.insert(sessionTable).values({ id: `s-${username}`, token: `t-${username}`, userId: login.id, expiresAt: new Date(Date.now() + 3600_000), updatedAt: new Date() });
    await applyLoginPlan("update", { id: employeeId, name: "Test Login" }, { ...input, password: "senha-nova-123" }, login);
    expect(await flag(login.id)).toBe(true);
    expect(await db.select().from(sessionTable).where(eq(sessionTable.userId, login.id))).toEqual([]);
  });

  it("lets only an admin move someone who can sign in to another role", async () => {
    const [{ id: otherRoleId }] = await db.insert(role).values({ role: "test-login-other" }).returning({ id: role.id });
    const form = (r: number) => {
      const f = new FormData();
      const fields = { name: "Test Login", cpf: String(Date.now()).slice(-11).padStart(11, "0"), rg: `r${username}`, issuingAuthority: "SSP", roleId: String(r) };
      // An admin's form carries the login fields: keep the access (a blank password keeps the current one)
      if (caller.user.role === "admin") Object.assign(fields, { access: "on", username });
      for (const [k, v] of Object.entries(fields)) f.set(k, v);
      return f;
    };
    const save = (r: number) => saveEmployee(employeeId, {}, form(r)).catch((e: Error) => e.message);
    try {
      caller.user = { id: "someone-else", role: "user" };
      expect(await save(otherRoleId)).toMatchObject({ errors: { roleId: [expect.stringContaining("Somente administradores")] } });
      // Other fields still save when the role stays
      expect(await save(roleId)).toBe("REDIRECT /employees?msg=updated");

      caller.user = { id: "an-admin", role: "admin" };
      expect(await save(otherRoleId)).toBe("REDIRECT /employees?msg=updated");
      expect(await save(roleId)).toBe("REDIRECT /employees?msg=updated");
    } finally {
      caller.user = { id: "someone-else", role: "user" };
      await db.update(employee).set({ roleId }).where(eq(employee.id, employeeId));
      await db.delete(role).where(eq(role.id, otherRoleId));
    }
  });

  it("lets only another admin delete an employee who has a login", async () => {
    const login = (await employeeLogin(employeeId))!;

    caller.user = { id: "someone-else", role: "user" };
    expect(await del()).toBe("REDIRECT /employees?msg=employee_has_login");
    // An admin can't delete their own record
    caller.user = { id: login.id, role: "admin" };
    expect(await del()).toBe("REDIRECT /employees?msg=employee_has_login");
    expect(await employeeLogin(employeeId)).toBeDefined();

    caller.user = { id: "another-admin", role: "admin" };
    expect(await del()).toBe("REDIRECT /employees?msg=deleted");
    expect(await employeeLogin(employeeId)).toBeUndefined();
  });
});
