"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { EXAM_KINDS } from "@/lib/grades";
import { saveExamType } from "./actions";

export function ExamTypeForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveExamType.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults ?? { kind: "R", maxScore: "10.00", order: "0" }}>
        <TextField name="name" label="Nome" maxLength={50} />
        <TextField name="code" label="Sigla" maxLength={5} />
        <SelectField name="kind" label="Tipo" options={EXAM_KINDS} />
        <TextField
          name="maxScore"
          label="Nota máxima"
          type="number"
          step="0.01"
          help="A parte do bimestre que esta avaliação vale (ex.: PS 3, PB 6)"
        />
        <TextField name="order" label="Ordem" type="number" help="Posição da coluna no boletim" />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/grades/exam-types" />
    </form>
  );
}
