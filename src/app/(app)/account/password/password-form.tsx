"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { changePassword } from "./actions";

export function PasswordForm({ forced, home = "/" }: { forced: boolean; home?: string }) {
  const [state, action, pending] = useActionState(changePassword, {});
  return (
    <form action={action} className="flex max-w-md flex-col gap-4">
      <FormFields state={state}>
        <TextField
          name="currentPassword"
          label={forced ? "Senha provisória" : "Senha atual"}
          type="password"
          autoComplete="current-password"
        />
        <TextField
          name="newPassword"
          label="Nova senha"
          type="password"
          autoComplete="new-password"
          help="Pelo menos 8 caracteres."
        />
        <TextField name="confirmPassword" label="Repita a nova senha" type="password" autoComplete="new-password" />
      </FormFields>
      <FormButtons pending={pending} cancelHref={home} label="Alterar senha" />
    </form>
  );
}
