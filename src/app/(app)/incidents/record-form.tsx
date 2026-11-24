"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { today } from "@/lib/finance";
import { saveRecord } from "./actions";

type Props = {
  id?: number | null;
  defaults?: Record<string, unknown>;
  again?: boolean;
  enrollments: [number, string][];
  types: [number, string][];
};

export function RecordForm(props: Props) {
  const [state, action, pending] = useActionState(saveRecord.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults ?? { incidentDate: today() }}>
        <Combobox
          name="enrollmentId"
          label="Aluno"
          options={props.enrollments}
          placeholder="Buscar aluno pelo nome…"
          autoFocus={props.again}
        />
        <SelectField name="incidentTypeId" label="Tipo" options={props.types} />
        <TextField name="incidentDate" label="Data da ocorrência" type="date" />
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/incidents"
        label={props.id ? "Salvar alterações" : "Registrar ocorrência"}
        another={props.id ? undefined : "Registrar e começar outra"}
      />
    </form>
  );
}
