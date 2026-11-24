"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField, TextareaField } from "@/components/form-fields";
import { WORKLOAD_TYPES } from "@/lib/pathways";
import { savePathway } from "./actions";

export function PathwayForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(savePathway.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields
        state={state}
        defaults={defaults ?? { extraPoints: "0.00", workloadType: "N", workloadHours: "0.00" }}
      >
        <TextField name="name" label="Nome" maxLength={50} />
        <TextField
          name="extraPoints"
          label="Nota máxima"
          type="number"
          step="0.01"
          help="Maior nota que o professor pode dar no bimestre; deixe 0 se o itinerário não dá nota extra"
        />
        <SelectField
          name="workloadType"
          label="Carga horária"
          options={WORKLOAD_TYPES}
          help="Por presença: cada aula assistida vale 45 minutos"
        />
        <TextField
          name="workloadHours"
          label="Horas no ano"
          type="number"
          step="0.01"
          optional
          help="Só para carga horária fixa"
        />
        <TextareaField name="description" label="Descrição" optional />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/pathways" />
    </form>
  );
}
