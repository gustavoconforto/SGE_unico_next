import "server-only";

import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { roleList, statement } from "@/lib/permissions";
import { getCurrentSession, requireSession } from "@/lib/session";

type Resource = keyof typeof statement;

type Action<R extends Resource> = (typeof statement)[R][number];

export async function hasPermission<R extends Resource>(resource: R, action: Action<R>): Promise<boolean> {
  const session = await getCurrentSession();
  if (!session) return false;
  const result = await auth.api.userHasPermission({
    body: { userId: session.user.id, permissions: { [resource]: [action] } },
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
