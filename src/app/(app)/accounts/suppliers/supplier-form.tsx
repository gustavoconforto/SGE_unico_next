"use client";

import { useActionState } from "react";
import { FormButtons, FormFields, TextField, TextareaField } from "@/components/form-fields";
import { saveSupplier } from "./actions";

export function SupplierForm({ id = null, defaults }: { id?: number | null; defaults?: Record<string, unknown> }) {
  const [state, action, pending] = useActionState(saveSupplier.bind(null, id), {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <TextField name="name" label="Nome" maxLength={200} />
        <TextField name="document" label="CPF/CNPJ" maxLength={14} inputMode="numeric" placeholder="Somente números" optional />
        <TextField name="phone" label="Telefone" maxLength={20} optional />
        <TextField name="email" label="E-mail" type="email" optional />
        <TextareaField name="notes" label="Observações" optional />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/accounts/suppliers" />
    </form>
  );
}
