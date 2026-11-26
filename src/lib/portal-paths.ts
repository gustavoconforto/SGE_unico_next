// The guardian portal's routes, shared by the proxy (edge-safe: no server-only imports) and the portal pages.
export const PORTAL_HOME = "/portal";
export const PORTAL_LOGIN = "/portal/login";
export const PORTAL_PASSWORD = "/portal/password";

export const isPortalPath = (pathname: string) => pathname === PORTAL_HOME || pathname.startsWith(`${PORTAL_HOME}/`);
