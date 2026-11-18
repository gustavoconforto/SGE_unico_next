import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";

export const metadata: Metadata = { title: "Acesso negado" };

/** Shown by the proxy in place of a page the user's groups don't allow, and by requirePermission() after an action. */
export default function ForbiddenPage() {
  return (
    <div className="flex max-w-lg flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Acesso negado</h1>
      <p className="text-gray-700">Seu cargo não tem permissão para esta tela ou ação. Se precisar dela, peça a um administrador para incluir seu cargo em um grupo com essa permissão.</p>
      <LinkButton href="/">Voltar ao início</LinkButton>
    </div>
  );
}
