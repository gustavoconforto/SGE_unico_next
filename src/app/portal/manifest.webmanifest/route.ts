import type { MetadataRoute } from "next";
import { PORTAL_HOME } from "@/lib/portal-paths";

// A route, not manifest.ts: that file convention exists only at the app root, which holds the staff manifest
export function GET() {
  const manifest: MetadataRoute.Manifest = {
    id: PORTAL_HOME,
    name: "Único Educacional — Responsáveis",
    short_name: "Único",
    description: "Turmas, horários e avisos da escola",
    start_url: PORTAL_HOME,
    scope: PORTAL_HOME,
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#ffffff",
    icons: [
      { src: "/img/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/img/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
  };
  return Response.json(manifest, { headers: { "Content-Type": "application/manifest+json" } });
}
