import type { Metadata, Viewport } from "next";

// Its own manifest so guardians and students install the portal (scope /portal), not the staff system
export const metadata: Metadata = {
  title: { default: "Portal do Aluno e do Responsável", template: "%s | Portal Único" },
  description: "Único Educacional — portal do aluno e do responsável",
  manifest: "/portal/manifest.webmanifest",
  appleWebApp: { capable: true, title: "Único", statusBarStyle: "default" },
};

export const viewport: Viewport = { themeColor: "#ffffff" };

export default function PortalLayout({ children }: LayoutProps<"/portal">) {
  return children;
}
