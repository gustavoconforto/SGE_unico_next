"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { today } from "@/lib/finance";
import { saveReceivedDocument } from "./actions";

type Props = {
  id?: number | null;
  defaults?: Record<string, unknown>;
  again?: boolean;
  enrollments: [number, string][];
  types: [number, string][];
};

export function ReceivedDocumentForm(props: Props) {
  const [state, action, pending] = useActionState(saveReceivedDocument.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults ?? { receivedDate: today() }}>
        <Combobox
          name="enrollmentId"
          label="Aluno"
          options={props.enrollments}
          placeholder="Buscar aluno pelo nome…"
          autoFocus={props.again}
        />
        <SelectField name="documentTypeId" label="Tipo de documento" options={props.types} />
        <TextField name="receivedDate" label="Data de recebimento" type="date" />
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/documents"
        label={props.id ? "Salvar alterações" : "Registrar documento"}
        another={props.id ? undefined : "Registrar e começar outro"}
      />
    </form>
  );
}
