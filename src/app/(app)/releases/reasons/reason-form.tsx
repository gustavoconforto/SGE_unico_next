"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveReason } from "./actions";

export function ReasonForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveReason.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="reason" label="Motivo" maxLength={100} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/releases/reasons" />
    </form>
  );
}
