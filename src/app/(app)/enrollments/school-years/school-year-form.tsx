"use client";

import { useActionState } from "react";
import { Fieldset, FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveSchoolYear } from "./actions";

export function SchoolYearForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveSchoolYear.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <Fieldset legend="Ano letivo">
          <TextField name="begins" label="Data de início" type="date" />
          <TextField name="ends" label="Data de fim" type="date" />
          <TextField name="schoolDays" label="Dias letivos" type="number" />
          <TextField name="totalHours" label="Carga horária (horas)" type="number" />
        </Fieldset>
        {[1, 2, 3, 4].map((n) => (
          <Fieldset key={n} legend={`${n}º bimestre`}>
            <TextField name={`bi${n}Begins`} label="Início" type="date" optional />
            <TextField name={`bi${n}Ends`} label="Fim" type="date" optional />
          </Fieldset>
        ))}
      </FormFields>
      <FormButtons pending={pending} cancelHref="/enrollments/school-years" />
    </form>
  );
}
