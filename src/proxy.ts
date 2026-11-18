import { type NextRequest, NextResponse } from "next/server";
import { userAccess } from "@/lib/access";
import { auth } from "@/lib/auth";
import { canOpen, routePermission } from "@/lib/permissions";

// Better Auth validates the session (signature, expiry; revocation and bans within the cookie cache's 60 s) before any page runs:
// a layout check alone doesn't stop the page from rendering into the response.
export async function proxy(request: NextRequest) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  // A password an admin picked must be replaced before anything else. The cached cookie can still say so for up
  // to 60 s after the change, so a flagged session is confirmed against Postgres before redirecting.
  if (session.user.mustChangePassword && request.nextUrl.pathname !== PASSWORD_PAGE) {
    const fresh = await auth.api.getSession({ headers: request.headers, query: { disableCookieCache: true } });
    if (fresh?.user.mustChangePassword) return NextResponse.redirect(new URL(PASSWORD_PAGE, request.url));
  }
  // Pages and the Server Actions posted to them: one gate for every path (each action checks its own permission too).
  // Open paths (home, password, every /media photo) skip the permission query.
  if (routePermission(request.nextUrl.pathname) === null) return NextResponse.next();
  const { all, granted } = await userAccess(session.user);
  if (!canOpen(request.nextUrl.pathname, granted, all)) return NextResponse.rewrite(new URL("/forbidden", request.url));
  return NextResponse.next();
}

const PASSWORD_PAGE = "/account/password";

export const config = {
  matcher: ["/((?!login|api/auth|_next|img|favicon.ico|apple-icon|manifest.webmanifest|robots.txt).*)"],
};
