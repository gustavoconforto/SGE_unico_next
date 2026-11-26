// Employee logins against the dev database (gestao-pg): a reset signs the user out and forces a new password,
// and deleting the employee (which deletes the login by FK cascade) is for another admin only.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { employeesEmployee as employee, employeesEmployeeroletype as role } from "@/db/schema/app";
import { session as sessionTable, user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { applyLoginPlan, ownerLogin } from "@/lib/login";
import { deleteEmployee, setUserRoles } from "./actions";

const caller = vi.hoisted(() => ({ user: { id: "", role: "admin" } }));
// An admin caller: the login rules are under test
vi.mock("@/lib/authorization", () => ({ requireAdmin: async () => caller }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
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
  const input = { access: true, username, password: "senha-inicial" };
  const del = () => deleteEmployee(employeeId).catch((e: Error) => e.message);

  beforeAll(async () => {
    [{ id: roleId }] = await db.insert(role).values({ role: "test-login" }).returning({ id: role.id });
    const blank = {
      sex: "M",
      cpf: "",
      rg: "",
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
    };
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

  const flag = async (id: string) =>
    (await db.select({ f: user.mustChangePassword }).from(user).where(eq(user.id, id)))[0].f;

  it("creates a login that must change its password, and a reset signs it out", async () => {
    await applyLoginPlan("create", { employeeId }, "Test Login", input, undefined);
    const login = (await ownerLogin({ employeeId }))!;
    expect(login).toMatchObject({ username, role: "user" });
    expect(await flag(login.id)).toBe(true);

    // The employee changed the password and has a session; then an admin resets it (the roles picked on the list stay)
    await db.update(user).set({ mustChangePassword: false, role: "admin,secretaria" }).where(eq(user.id, login.id));
    await db.insert(sessionTable).values({
      id: `s-${username}`,
      token: `t-${username}`,
      userId: login.id,
      expiresAt: new Date(Date.now() + 3600_000),
      updatedAt: new Date(),
    });
    await applyLoginPlan("update", { employeeId }, "Test Login", { ...input, password: "senha-nova-123" }, login);
    expect(await flag(login.id)).toBe(true);
    expect(await db.select().from(sessionTable).where(eq(sessionTable.userId, login.id))).toEqual([]);
    expect((await ownerLogin({ employeeId }))!.role).toBe("admin,secretaria");
  });

  it("lets only another admin delete an employee who has a login", async () => {
    const login = (await ownerLogin({ employeeId }))!;

    // An admin can't delete their own record
    caller.user = { id: login.id, role: "admin" };
    expect(await del()).toBe("REDIRECT /employees?msg=employee_has_login");
    expect(await ownerLogin({ employeeId })).toBeDefined();

    caller.user = { id: "another-admin", role: "admin" };
    expect(await del()).toBe("REDIRECT /employees?msg=deleted");
    expect(await ownerLogin({ employeeId })).toBeUndefined();
  });
});

describe("setUserRoles", () => {
  const form = (...roles: string[]) => {
    const f = new FormData();
    for (const r of roles) f.append("role", r);
    return f;
  };
  const run = (userId: string, f: FormData) => setUserRoles(userId, f).catch((e: Error) => e.message);

  it("saves only known roles, and an admin can't drop their own admin role", async () => {
    const setRole = vi.spyOn(auth.api, "setRole").mockResolvedValue({} as never);
    caller.user = { id: "an-admin", role: "admin" };
    try {
      // A crafted form can't save a role that doesn't exist (nor an Object prototype key)
      expect(await run("other", form("secretaria", "superuser", "toString"))).toBe("REDIRECT /employees?msg=updated");
      expect(setRole).toHaveBeenLastCalledWith(
        expect.objectContaining({ body: { userId: "other", role: ["secretaria"] } }),
      );
      expect(await run("other", form())).toBe("REDIRECT /employees?msg=updated");
      expect(setRole).toHaveBeenLastCalledWith(expect.objectContaining({ body: { userId: "other", role: "user" } }));

      setRole.mockClear();
      expect(await run("an-admin", form("secretaria"))).toBe("REDIRECT /employees?msg=own_admin");
      expect(setRole).not.toHaveBeenCalled();
    } finally {
      setRole.mockRestore();
      caller.user = { id: "", role: "admin" };
    }
  });
});
