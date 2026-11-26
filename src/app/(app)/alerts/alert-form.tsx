"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextareaField, TextField } from "@/components/form-fields";
import { createAlert } from "./actions";

export function AlertForm({ classes }: { classes: [number, string][] }) {
  const [state, action, pending] = useActionState(createAlert, {});
  return (
    <form action={action} className="flex max-w-2xl flex-col gap-4">
      <FormFields state={state}>
        <TextField name="title" label="Título" maxLength={120} />
        <SelectField
          name="schoolClassId"
          label="Turma"
          options={classes}
          optional
          emptyLabel="Todos os responsáveis"
          help="Só os responsáveis de alunos ativos na turma verão o aviso."
        />
        <div className="sm:col-span-2">
          <TextareaField name="body" label="Mensagem" rows={6} />
        </div>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/alerts" label="Enviar aviso" />
    </form>
  );
}
