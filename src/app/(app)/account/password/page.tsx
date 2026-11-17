import { Alert } from "flowbite-react";
import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { PasswordForm } from "./password-form";

export const metadata: Metadata = { title: "Alterar senha" };

export default async function ChangePasswordPage() {
  const session = await requireSession();
  const forced = session.user.mustChangePassword === true;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Alterar senha</h1>
      {forced && (
        <Alert color="warning" className="max-w-md">
          Sua senha foi definida por um administrador. Escolha uma senha pessoal para continuar.
        </Alert>
      )}
      <PasswordForm forced={forced} />
    </div>
  );
}
