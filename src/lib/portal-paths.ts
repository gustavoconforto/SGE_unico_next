// The portal's routes (guardians and students), shared by the proxy (edge-safe: no server-only imports) and its pages.
export const PORTAL_HOME = "/portal";
export const PORTAL_LOGIN = "/portal/login";
export const PORTAL_PASSWORD = "/portal/password";

export const isPortalPath = (pathname: string) => pathname === PORTAL_HOME || pathname.startsWith(`${PORTAL_HOME}/`);

/** A guardian's or a student's login: the portal is all it sees. */
export const isPortalUser = (user: { guardianId?: number | null; studentId?: number | null }) =>
  user.guardianId != null || user.studentId != null;
