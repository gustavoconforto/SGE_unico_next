"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField } from "@/components/form-fields";
import { PersonFields } from "@/components/person-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatPhone } from "@/lib/person";
import { MARITAL_STATUS } from "@/lib/students";
import { saveGuardian } from "./actions";

export function GuardianForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveGuardian.bind(null, id), {});
  const shown = defaults && { ...defaults, phone: formatPhone(defaults.phone as string), mobile: formatPhone(defaults.mobile as string) };
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={shown}>
        <PersonFields
          personal={<SelectField name="maritalStatus" label="Estado civil" options={MARITAL_STATUS} optional />}
          // Saved guardians only, like the student form; it follows the number as it is edited
          mobileAction={id ? <WhatsAppLink field="mobile" phone={defaults?.mobile as string} /> : undefined}
        />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/guardians" />
    </form>
  );
}
