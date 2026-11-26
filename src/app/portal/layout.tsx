import type { Metadata, Viewport } from "next";

// Its own manifest so guardians install the portal (scope /portal), not the staff system
export const metadata: Metadata = {
  title: { default: "Portal dos Responsáveis", template: "%s | Portal dos Responsáveis" },
  description: "Único Educacional — portal dos responsáveis",
  manifest: "/portal/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Único", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return children;
}
