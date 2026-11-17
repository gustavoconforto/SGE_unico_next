"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveIncidentType } from "./actions";

export function IncidentTypeForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveIncidentType.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="type" label="Tipo" maxLength={100} />
        <TextField name="penalty" label="Penalidade" type="number" step="0.1" help="Descontada da nota de conceito do bimestre" />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/incidents/types" />
    </form>
  );
}
