"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { saveRole } from "./actions";

export function RoleForm({ id = null, defaults }: { id?: number | null; defaults?: { role: string } }) {
  const [state, action, pending] = useActionState(saveRole.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="role" label="Cargo" maxLength={20} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/employees/roles" />
    </form>
  );
}
