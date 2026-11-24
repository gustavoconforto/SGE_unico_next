"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { saveSubject } from "./actions";

export function SubjectForm({
  id = null,
  defaults,
  departments,
}: {
  id?: number | null;
  defaults?: Record<string, unknown>;
  departments: [number, string][];
}) {
  const [state, action, pending] = useActionState(saveSubject.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="name" label="Nome" maxLength={50} />
        <SelectField name="departmentId" label="Departamento" options={departments} optional />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/grades/subjects" />
    </form>
  );
}
