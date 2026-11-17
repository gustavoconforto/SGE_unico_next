"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { today } from "@/lib/finance";
import { saveSession } from "./actions";

export function SessionForm(props: { id?: number | null; back: string; defaults?: Record<string, unknown>; offerings: [number, string][] }) {
  const [state, action, pending] = useActionState(saveSession.bind(null, props.id ?? null, props.back), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={{ date: today(), ...props.defaults }}>
        <SelectField name="offeringId" label="Turma de itinerário" options={props.offerings} disabled={!!props.id} help={props.id ? "A chamada pertence aos alunos desta turma; não pode ser trocada." : undefined} />
        <TextField name="date" label="Data da aula" type="date" />
        <TextField name="topic" label="Conteúdo" maxLength={200} optional />
      </FormFields>
      <FormButtons pending={pending} cancelHref={props.back} />
    </form>
  );
}
