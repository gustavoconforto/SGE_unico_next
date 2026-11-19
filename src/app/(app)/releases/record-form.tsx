"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { today } from "@/lib/finance";
import { saveExit } from "./actions";

type Props = { id?: number | null; defaults?: Record<string, unknown>; again?: boolean; enrollments: [number, string][]; reasons: [number, string][] };

export function ExitForm(props: Props) {
  const [state, action, pending] = useActionState(saveExit.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults ?? { exitDate: today() }}>
        <Combobox name="enrollmentId" label="Aluno" options={props.enrollments} placeholder="Buscar aluno pelo nome…" autoFocus={props.again} />
        <TextField name="exitDate" label="Data" type="date" />
        <SelectField name="reasonId" label="Motivo" options={props.reasons} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/releases" label={props.id ? "Salvar alterações" : "Registrar liberação"} another={props.id ? undefined : "Registrar e começar outra"} />
    </form>
  );
}
