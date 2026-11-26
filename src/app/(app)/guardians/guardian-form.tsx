"use client";

import { useActionState, useState } from "react";
import { CheckboxField, Fieldset, FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { type AddressSource, CopyAddressSearch } from "@/components/copy-address";
import { PersonFields } from "@/components/person-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatPhone } from "@/lib/person";
import { MARITAL_STATUS } from "@/lib/students";
import { saveGuardian } from "./actions";

export function GuardianForm({
  id = null,
  defaults,
  others,
}: {
  id?: number | null;
  defaults?: Record<string, unknown>;
  /** Saved guardians whose address can be copied into this one. */
  others: AddressSource[];
}) {
  const [state, action, pending] = useActionState(saveGuardian.bind(null, id), {});
  const hasLogin = defaults?.access === true;
  const [access, setAccess] = useState(hasLogin);
  const shown = defaults && {
    ...defaults,
    phone: formatPhone(defaults.phone as string),
    mobile: formatPhone(defaults.mobile as string),
  };
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={shown}>
        <PersonFields
          digitPhones
          addressAction={<CopyAddressSearch sources={others.filter((g) => g.id !== id)} />}
          personal={<SelectField name="maritalStatus" label="Estado civil" options={MARITAL_STATUS} optional />}
          // Saved guardians only, like the student form; it follows the number as it is edited
          mobileAction={id ? <WhatsAppLink field="mobile" phone={defaults?.mobile as string} /> : undefined}
        />
        <Fieldset legend="Acesso ao portal dos responsáveis">
          <div className="sm:col-span-2" onChange={(e) => setAccess((e.target as HTMLInputElement).checked)}>
            <CheckboxField
              name="access"
              label="Pode acessar o portal"
              help="O usuário é o CPF. Desmarcar apaga o acesso do responsável."
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
                  ? "Deixe em branco para manter a senha atual. Uma nova senha encerra as sessões do responsável."
                  : "Senha provisória, com pelo menos 8 caracteres: o responsável a troca no primeiro acesso."
              }
            />
          )}
        </Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/guardians" />
    </form>
  );
}
