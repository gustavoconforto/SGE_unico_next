"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField } from "@/components/form-fields";
import { PersonFields } from "@/components/person-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { saveEmployee } from "./actions";

export function EmployeeForm(props: { id?: number | null; defaults?: Record<string, unknown>; roles: [number, string][] }) {
  const [state, action, pending] = useActionState(saveEmployee.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={props.defaults}>
        <PersonFields
          personal={<SelectField name="roleId" label="Cargo" options={props.roles} />}
          // Saved employees only, like students and guardians; it follows the number as it is edited
          mobileAction={props.id ? <WhatsAppLink field="mobile" phone={props.defaults?.mobile as string} /> : undefined}
        />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/employees" />
    </form>
  );
}
