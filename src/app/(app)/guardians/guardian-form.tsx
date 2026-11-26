"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField } from "@/components/form-fields";
import { type AddressSource, CopyAddressSearch } from "@/components/copy-address";
import { PersonFields } from "@/components/person-fields";
import { PortalAccessFields } from "@/components/portal-access-fields";
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
        <PortalAccessFields hasLogin={defaults?.access === true} username="o CPF" who="do responsável" />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/guardians" />
    </form>
  );
}
