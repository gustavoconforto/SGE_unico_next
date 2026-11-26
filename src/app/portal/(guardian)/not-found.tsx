import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { PORTAL_HOME } from "@/lib/portal-paths";

export const metadata: Metadata = { title: "Página não encontrada" };

/** The portal's 404: a guardian has no staff menu or student search to go back to. */
export default function PortalNotFound() {
  return (
    <div className="flex flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Página não encontrada</h1>
      <p className="text-gray-700">O endereço pode estar errado ou não pertencer aos seus alunos.</p>
      <LinkButton href={PORTAL_HOME}>Voltar ao início</LinkButton>
    </div>
  );
}
