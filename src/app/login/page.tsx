import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    // Top-aligned so the phone keyboard doesn't cover the button and the error alert doesn't shift the fields
    <main className="flex min-h-screen items-start justify-center bg-gray-50 px-4 pt-12 pb-4 sm:pt-[18vh]">
      <div className="flex w-full max-w-sm flex-col gap-4 rounded-lg bg-white p-6 drop-shadow-md">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/img/unico_logo_pequeno.png" alt="" width={56} height={56} className="rounded-lg" />
          {/* Same name the app shell shows, so staff know they're in the right place */}
          <h1 className="text-lg font-semibold text-gray-900">Único Educacional</h1>
          <p className="text-sm text-gray-600">Gestão Escolar · entre com seu usuário</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-gray-600">Sistema restrito aos servidores do colégio</p>
      </div>
    </main>
  );
}
