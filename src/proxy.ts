import { type NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";

// Better Auth validates the session (signature, expiry; revocation and bans within the cookie cache's 60 s) before any page runs:
// a layout check alone doesn't stop the page from rendering into the response.
export async function proxy(request: NextRequest) {
  if (!(await auth.api.getSession({ headers: request.headers }))) {
    const login = new URL("/login", request.url);
    login.searchParams.set("next", request.nextUrl.pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!login|api/auth|_next|img|favicon.ico).*)"],
};
