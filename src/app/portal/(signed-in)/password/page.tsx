import { Alert } from "flowbite-react";
import type { Metadata } from "next";
import { PORTAL_HOME } from "@/lib/portal-paths";
import { PasswordForm } from "../../../(app)/account/password/password-form";
import { requirePortalUser } from "../../data";

export const metadata: Metadata = { title: "Alterar senha" };

export default async function PortalPasswordPage() {
  const { session } = await requirePortalUser();
  const forced = session.user.mustChangePassword === true;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Alterar senha</h1>
      {forced && (
        <Alert color="warning">Sua senha foi definida pela secretaria. Escolha uma senha pessoal para continuar.</Alert>
      )}
      <PasswordForm forced={forced} home={PORTAL_HOME} />
    </div>
  );
}
