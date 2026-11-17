"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveProgram } from "./actions";

export function ProgramForm({ id = null, defaults }: { id?: number | null; defaults?: { name: string } }) {
  const [state, action, pending] = useActionState(saveProgram.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="name" label="Nome" maxLength={50} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/programs" />
    </form>
  );
}
