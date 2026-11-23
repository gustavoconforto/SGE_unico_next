import { cache } from "react";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Once per request: the layout, the page, its permission checks and its actions all ask. */
export const getCurrentSession = cache(async () => auth.api.getSession({ headers: await headers() }));

/** Replaces Django's LoginRequiredMiddleware: call in every page tree and every Server Action. */
export async function requireSession() {
  const session = await getCurrentSession();
  if (!session) redirect("/login");
  return session;
}

/** Wraps a layout's page tree: nothing below renders without a session (the proxy checks too). */
export async function Authenticated({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
