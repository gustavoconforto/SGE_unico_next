"use client";

import { useActionState } from "react";
import { Combobox } from "@/components/combobox";
import { FormButtons, FormFields, TextField } from "@/components/form-fields";
import { createInstallment } from "./actions";

export function InstallmentForm({
  accounts,
  defaults,
}: {
  accounts: [number, string][];
  defaults?: Record<string, unknown>;
}) {
  const [state, action, pending] = useActionState(createInstallment, {});
  return (
    <form action={action} className="flex max-w-lg flex-col gap-4">
      <FormFields state={state} defaults={defaults}>
        <Combobox name="accountId" label="Conta" options={accounts} placeholder="Buscar conta pela descrição…" />
        <TextField
          name="number"
          label="Número da parcela"
          type="number"
          optional
          help="Deixe em branco para usar o próximo número"
        />
        <TextField name="dueDate" label="Vencimento" type="date" />
        <TextField name="amount" label="Valor (R$)" type="number" step="0.01" />
      </FormFields>
      <FormButtons pending={pending} cancelHref="/accounts/installments" />
    </form>
  );
}
