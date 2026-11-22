import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { statement } from "@/lib/permissions";

type Resource = keyof typeof statement;

type Action<R extends Resource> = (typeof statement)[R][number];

export const getCurrentSession = cache(async () => {
  return auth.api.getSession({
    headers: await headers(),
  });
});

export async function isAdmin(): Promise<boolean> {
  const session = await getCurrentSession();

  if (!session) return false;

  const roles = (session.user.role ?? "").split(",").map((role) => role.trim());

  return roles.includes("admin");
}

export async function hasPermission<R extends Resource>(
  resource: R,
  action: Action<R>,
): Promise<boolean> {
  const session = await getCurrentSession();

  if (!session) return false;

  const result = await auth.api.userHasPermission({
    body: {
      userId: session.user.id,
      permissions: {
        [resource]: [action],
      },
    },
  });

  return result.success;
}

export async function requireAdmin() {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  if (!(await isAdmin())) {
    redirect("/forbidden");
  }

  return session;
}

export async function requirePermission<R extends Resource>(
  resource: R,
  action: Action<R>,
) {
  const session = await getCurrentSession();

  if (!session) redirect("/login");

  if (!(await hasPermission(resource, action))) {
    redirect("/forbidden");
  }

  return session;
}
