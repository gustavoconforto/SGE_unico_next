"use client";

import { useState } from "react";
import { CheckboxField, Fieldset, TextField } from "./form-fields";

/**
 * A guardian's or student's portal login inside a <FormFields>: posts `access` and `password` (see `loginPlan`).
 * `username` names what they sign in with ("o CPF", "a matrícula"); `who` names them in the help ("do aluno").
 */
export function PortalAccessFields({ hasLogin, username, who }: { hasLogin: boolean; username: string; who: string }) {
  const [access, setAccess] = useState(hasLogin);
  return (
    <Fieldset legend="Acesso ao portal">
      <div className="sm:col-span-2" onChange={(e) => setAccess((e.target as HTMLInputElement).checked)}>
        <CheckboxField
          name="access"
          label="Pode acessar o portal"
          help={`O usuário é ${username}. Desmarcar apaga o acesso ${who}.`}
        />
      </div>
      {access && (
        <TextField
          name="password"
          label="Senha"
          type="password"
          autoComplete="new-password"
          optional={hasLogin}
          help={
            hasLogin
              ? `Deixe em branco para manter a senha atual. Uma nova senha encerra as sessões ${who}.`
              : "Senha provisória, com pelo menos 8 caracteres: ela é trocada no primeiro acesso."
          }
        />
      )}
    </Fieldset>
  );
}
