import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { isPortalPath, isPortalUser, PORTAL_HOME, PORTAL_LOGIN, PORTAL_PASSWORD } from "@/lib/portal-paths";

// Better Auth validates the session (signature, expiry; revocation and bans within the cookie cache's 60 s) before any page runs:
// a layout check alone doesn't stop the page from rendering into the response. Guardians and students only see the portal
// and staff only the system: each side's pages assume its own kind of login.
export async function proxy(request: NextRequest) {
  const portal = isPortalPath(request.nextUrl.pathname);
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const login = new URL(portal ? PORTAL_LOGIN : "/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  const portalUser = isPortalUser(session.user);
  if (portalUser !== portal) return NextResponse.redirect(new URL(portalUser ? PORTAL_HOME : "/", request.url));
  // A password staff picked must be replaced before anything else. The cached cookie can still say so for up
  // to 60 s after the change, so a flagged session is confirmed against Postgres before redirecting.
  const passwordPage = portalUser ? PORTAL_PASSWORD : PASSWORD_PAGE;
  if (session.user.mustChangePassword && request.nextUrl.pathname !== passwordPage) {
    const fresh = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
    if (fresh?.user.mustChangePassword) return NextResponse.redirect(new URL(passwordPage, request.url));
  }
  return NextResponse.next();
}

const PASSWORD_PAGE = "/account/password";

export const config = {
  matcher: [
    "/((?!login|portal/login|portal/manifest.webmanifest|portal/sw.js|api/auth|_next|img|favicon.ico|apple-icon|manifest.webmanifest|robots.txt).*)",
  ],
};
