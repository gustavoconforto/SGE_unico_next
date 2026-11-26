import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { PORTAL_HOME } from "@/lib/portal-paths";
import { LoginForm } from "../../login/login-form";

export const metadata: Metadata = { title: "Entrar" };

// Same shell as the staff login: top-aligned so the phone keyboard doesn't cover the button
export default function PortalLoginPage() {
  return (
    <main className="flex min-h-screen items-start justify-center bg-gray-50 px-4 pt-12 pb-4 sm:pt-[18vh]">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 drop-shadow-md">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/img/unico_logo_pequeno.png" alt="" width={56} height={56} className="rounded-lg" />
          <p className="text-sm text-gray-600">Único Educacional</p>
          <h1 className="text-xl font-semibold text-gray-900">Portal dos Responsáveis</h1>
          <p className="text-sm text-gray-600">Acesso de pais e responsáveis: entre com o seu CPF.</p>
        </div>
        <Suspense>
          <LoginForm home={PORTAL_HOME} cpf />
        </Suspense>
        <p className="text-center text-xs text-gray-600">Sem acesso ou esqueceu a senha? Fale com a secretaria.</p>
        <p className="border-t border-gray-200 pt-4 text-center text-sm text-gray-600">
          É da equipe da escola?{" "}
          <Link href="/login" className="font-medium text-primary-700 underline-offset-2 hover:underline">
            Entrar no sistema de gestão
          </Link>
        </p>
      </div>
    </main>
  );
}
