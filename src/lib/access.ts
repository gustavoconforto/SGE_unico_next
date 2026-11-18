// Who holds which permission: an employee's role belongs to groups, each granting permission codes. Admins hold all.
import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "@/db";
import { accessGroupPermissions as groupPermission, accessGroupRoles as groupRole, employeesEmployee as employee } from "@/db/schema/app";
import type { Permission } from "./permissions";
import { requireSession } from "./session";

export type Access = { all: boolean; granted: ReadonlySet<string> };
type User = { role?: string | null; employeeId?: number | null };

/** Once per request: the proxy, the layout, the page and its actions all ask. A login with no employee holds nothing. */
const loadAccess = cache(async (admin: boolean, employeeId: number | null): Promise<Access> => {
  if (admin) return { all: true, granted: new Set() };
  if (!employeeId) return { all: false, granted: new Set() };
  const rows = await db
    .selectDistinct({ codename: groupPermission.codename })
    .from(groupPermission)
    .innerJoin(groupRole, eq(groupRole.groupId, groupPermission.groupId))
    .innerJoin(employee, eq(employee.roleId, groupRole.roleId))
    .where(eq(employee.id, employeeId));
  return { all: false, granted: new Set(rows.map((r) => r.codename)) };
});

export const userAccess = (user: User) => loadAccess(user.role === "admin", user.employeeId ?? null);

export async function hasPermission(user: User, permission: Permission) {
  const { all, granted } = await userAccess(user);
  return all || granted.has(permission);
}

/** Every Server Action calls this first (it replaces requireSession there): no session → /login, no permission → /forbidden. */
export async function requirePermission(permission: Permission) {
  const session = await requireSession();
  if (!(await hasPermission(session.user, permission))) redirect("/forbidden");
  return session;
}
