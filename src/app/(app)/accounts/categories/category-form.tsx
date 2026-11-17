"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { DIRECTIONS } from "@/lib/finance";
import { saveCategory } from "./actions";

export function CategoryForm({ id = null, defaults, directionLocked = false }: { id?: number | null; defaults?: Record<string, unknown>; directionLocked?: boolean }) {
  const [state, action, pending] = useActionState(saveCategory.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="name" label="Nome" maxLength={100} />
        <SelectField name="direction" label="Natureza" options={DIRECTIONS} disabled={directionLocked} help={directionLocked ? "Não pode ser alterada: a categoria já possui contas." : undefined} />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/accounts/categories" />
    </form>
  );
}
