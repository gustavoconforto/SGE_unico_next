import { Card } from "flowbite-react";
import type { Metadata } from "next";
import Image from "next/image";
import { Suspense } from "react";
import { LoginForm } from "./login-form";

export const metadata: Metadata = { title: "Login" };

export default function LoginPage() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-gray-50 p-4 dark:bg-gray-900">
      <Card className="w-full max-w-sm">
        <div className="flex flex-col items-center gap-2 text-center">
          <Image src="/img/unico_logo_pequeno.png" alt="" width={56} height={56} className="rounded-lg" />
          {/* Same name the app shell shows, so staff know they're in the right place */}
          <h1 className="text-lg font-semibold text-gray-900 dark:text-white">Único Educacional</h1>
          <p className="text-sm text-gray-600">Gestão escolar · entre com seu usuário</p>
        </div>
        <Suspense>
          <LoginForm />
        </Suspense>
        <p className="text-center text-xs text-gray-600">Sistema restrito aos servidores do colégio</p>
      </Card>
    </main>
  );
}
