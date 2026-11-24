"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { today } from "@/lib/finance";
import { saveQandA } from "./actions";

type Options = [number, string][];

export function QandAForm(props: {
  id?: number | null;
  defaults?: Record<string, unknown>;
  again?: boolean;
  enrollments: Options;
  subjects: Options;
}) {
  const [state, action, pending] = useActionState(saveQandA.bind(null, props.id ?? null), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={props.defaults ?? { qAndADate: today() }}>
        <Combobox
          name="enrollmentId"
          label="Aluno"
          options={props.enrollments}
          placeholder="Buscar aluno pelo nome…"
          autoFocus={props.again}
        />
        <SelectField name="subjectId" label="Disciplina" options={props.subjects} />
        <TextField name="qAndADate" label="Data do plantão" type="date" />
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/q-and-a"
        label={props.id ? "Salvar alterações" : "Registrar plantão"}
        another={props.id ? undefined : "Registrar e começar outro"}
      />
    </form>
  );
}
