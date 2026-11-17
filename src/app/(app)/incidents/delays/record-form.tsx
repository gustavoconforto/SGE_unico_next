"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { DELAY_TYPES } from "@/lib/incidents";
import { today } from "@/lib/finance";
import { saveRecord } from "./actions";

type Props = { id?: number | null; defaults?: Record<string, unknown>; again?: boolean; enrollments: [number, string][] };

export function RecordForm(props: Props) {
  const [state, action, pending] = useActionState(saveRecord.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults ?? { incidentDate: today() }}>
        <Combobox name="enrollmentId" label="Aluno" options={props.enrollments} placeholder="Buscar aluno pelo nome…" autoFocus={props.again} />
        <SelectField name="delayType" label="Tipo" options={DELAY_TYPES} />
        <TextField name="incidentDate" label="Data da ocorrência" type="date" />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/incidents/delays" label={props.id ? "Salvar alterações" : "Registrar atraso"} another={props.id ? undefined : "Registrar e começar outro"} />
    </form>
  );
}
