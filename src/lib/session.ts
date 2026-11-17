import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "./auth";

/** Replaces Django's LoginRequiredMiddleware: call in every page tree and every Server Action. */
export async function requireSession() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) redirect("/login");
  return session;
}

/** Wraps a layout's page tree: nothing below renders without a session (the proxy checks too). */
export async function Authenticated({ children }: { children: React.ReactNode }) {
  await requireSession();
  return children;
}
