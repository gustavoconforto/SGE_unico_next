"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { today } from "@/lib/finance";
import { saveMember } from "./actions";

type Options = [number, string][];

export function MemberForm(props: {
  id?: number | null;
  back: string;
  defaults?: Record<string, unknown>;
  offerings: Options;
  enrollments: Options;
}) {
  const [state, action, pending] = useActionState(saveMember.bind(null, props.id ?? null, props.back), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={{ joinedAt: today(), ...props.defaults }}>
        <SelectField name="offeringId" label="Turma de itinerário" options={props.offerings} />
        <Combobox name="enrollmentId" label="Aluno" options={props.enrollments} placeholder="Buscar aluno pelo nome…" />
        <TextField name="joinedAt" label="Data de entrada" type="date" />
        <TextField
          name="leftAt"
          label="Data de saída"
          type="date"
          optional
          help="Preencha quando o aluno sair do itinerário; o histórico é mantido"
        />
      </FormFields>
      <FormButtons pending={pending} cancelHref={props.back} />
    </form>
  );
}
