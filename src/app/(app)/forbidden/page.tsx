import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = { title: "Acesso negado" };

/** Where requirePermission() and requireAdmin() send a user whose roles don't allow the page or action. */
export default function ForbiddenPage() {
  return (
    <div className="flex max-w-lg flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Acesso negado</h1>
      <p className="text-gray-700">Seu perfil de acesso não tem permissão para esta tela ou ação. Se precisar dela, peça a um administrador.</p>
      <LinkButton href="/">Voltar ao início</LinkButton>
    </div>
  );
}
