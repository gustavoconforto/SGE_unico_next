"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveDocumentType } from "./actions";

export function DocumentTypeForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveDocumentType.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="type" label="Tipo" maxLength={100} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/documents/types" />
    </form>
  );
}
