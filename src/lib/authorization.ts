import "server-only";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { cache } from "react";

import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "@/lib/auth";
import { type RoleName, roleList, statement } from "@/lib/permissions";
import { getCurrentSession, requireSession } from "@/lib/session";

type Resource = keyof typeof statement;

type Action<R extends Resource> = (typeof statement)[R][number];

/** The user's roles from Postgres (not the 60 s cookie cache, so a role change applies at once), once per request. */
const currentRole = cache(async (userId: string) => {
  const [row] = await db.select({ role: user.role }).from(user).where(eq(user.id, userId));
  return row?.role ?? null;
});

export async function hasPermission<R extends Resource>(resource: R, action: Action<R>): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  const role = await currentRole(session.user.id);
  if (!role) return false;
  // Given the role, Better Auth checks it in memory ("admin,secretaria" is split like the user's own)
  const result = await auth.api.userHasPermission({
    body: { role: role as RoleName, permissions: { [resource]: [action] } },
  });
  return result.success;
}

/** Admin-only screens and actions (employees, logins, roles): no session → /login, not an admin → /forbidden. */
export async function requireAdmin() {
  const session = await requireSession();
  if (!roleList(session.user.role).includes("admin")) redirect("/forbidden");
  return session;
}

/** Every Server Action and page calls this first: no session → /login, no permission → /forbidden. */
export async function requirePermission<R extends Resource>(resource: R, action: Action<R>) {
  const session = await requireSession();
  if (!(await hasPermission(resource, action))) redirect("/forbidden");
  return session;
}
