"use client";

import { startTransition, useActionState, useState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { StudentChecklist } from "@/components/student-checklist";
import type { FormState } from "@/lib/form";
import { today } from "@/lib/finance";

type Props = {
  action: (prev: FormState, formData: FormData) => Promise<FormState>;
  students: [number, string][];
  typeName: string;
  types: readonly (readonly [string | number, string])[];
  cancelHref: string;
  /** Singular and plural of the record, for the submit label. */
  nouns: [string, string];
};

/** One type and date for every checked student (active enrollments, A→Z). */
export function BatchRecordForm(props: Props) {
  const [state, action, pending] = useActionState(props.action, {});
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  if (!props.students.length) return <p className="text-sm text-gray-700">Nenhum aluno com matrícula ativa.</p>;
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={{ incidentDate: today() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name={props.typeName} label="Tipo" options={props.types} />
          <TextField name="incidentDate" label="Data da ocorrência" type="date" />
        </div>
        <StudentChecklist students={props.students} checked={checked} onCheckedChange={setChecked} />
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref={props.cancelHref}
        sticky
        label={`Registrar ${checked.size ? `${checked.size} ` : ""}${props.nouns[checked.size === 1 ? 0 : 1]}`}
      />
    </form>
  );
}
