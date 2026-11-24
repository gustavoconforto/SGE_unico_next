"use client";

import { useActionState, useState } from "react";
import { CheckboxField, Fieldset, FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { PersonFields } from "@/components/person-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { suggestUsername } from "@/lib/format";
import { saveEmployee } from "./actions";

export function EmployeeForm(props: {
  id?: number | null;
  defaults?: Record<string, unknown>;
  roles: [number, string][];
}) {
  const [state, action, pending] = useActionState(saveEmployee.bind(null, props.id ?? null), {});
  const hasLogin = props.defaults?.access === true;
  const [access, setAccess] = useState(hasLogin);
  const [suggested, setSuggested] = useState("");

  // Ticking access mounts the username field: a new login starts from the name typed so far (still editable)
  function onAccessChange(e: React.FormEvent<HTMLDivElement>) {
    const box = e.target as HTMLInputElement;
    const name = box.form?.elements.namedItem("name") as HTMLInputElement | null;
    if (box.checked && !hasLogin) setSuggested(suggestUsername(name?.value ?? ""));
    setAccess(box.checked);
  }

  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={suggested ? { ...props.defaults, username: suggested } : props.defaults}>
        <PersonFields
          personal={<SelectField name="roleId" label="Cargo" options={props.roles} />}
          // Saved employees only, like students and guardians; it follows the number as it is edited
          mobileAction={props.id ? <WhatsAppLink field="mobile" phone={props.defaults?.mobile as string} /> : undefined}
        />
        <Fieldset legend="Acesso ao sistema">
          <div className="sm:col-span-2" onChange={onAccessChange}>
            <CheckboxField
              name="access"
              label="Pode acessar o sistema"
              help="Desmarcar apaga o login do funcionário."
            />
          </div>
          {access && (
            <>
              <TextField name="username" label="Usuário" maxLength={30} autoComplete="off" />
              <TextField
                name="password"
                label="Senha"
                type="password"
                autoComplete="new-password"
                optional={hasLogin}
                help={
                  hasLogin
                    ? "Deixe em branco para manter a senha atual. Uma nova senha encerra as sessões do funcionário."
                    : "Senha provisória, com pelo menos 8 caracteres: o funcionário a troca no primeiro acesso."
                }
              />
            </>
          )}
        </Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/employees" />
    </form>
  );
}
