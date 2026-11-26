"use client";

import { startTransition, useActionState, useState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { StudentChecklist } from "@/components/student-checklist";
import { DELAY_TYPES } from "@/lib/incidents";
import { today } from "@/lib/finance";
import { saveBatchRecords } from "../actions";

/** One delay type and date for every checked student (active enrollments, A→Z). */
export function BatchRecordForm({ students }: { students: [number, string][] }) {
  const [state, action, pending] = useActionState(saveBatchRecords, {});
  const [checked, setChecked] = useState<Set<number>>(new Set());

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  if (!students.length) return <p className="text-sm text-gray-700">Nenhum aluno com matrícula ativa.</p>;
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={{ incidentDate: today() }}>
        <div className="grid gap-4 sm:grid-cols-2">
          <SelectField name="delayType" label="Tipo" options={DELAY_TYPES} />
          <TextField name="incidentDate" label="Data da ocorrência" type="date" />
        </div>
        <StudentChecklist students={students} checked={checked} onCheckedChange={setChecked} />
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/incidents/delays"
        sticky
        label={`Registrar ${checked.size ? `${checked.size} ` : ""}atraso${checked.size === 1 ? "" : "s"}`}
      />
    </form>
  );
}
