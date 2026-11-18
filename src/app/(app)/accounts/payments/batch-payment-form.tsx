"use client";

import { startTransition, useActionState, useState } from "react";
import { Fieldset, FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { type Money, PAYMENT_METHODS, formatDate, formatMoney, money, today } from "@/lib/finance";
import { parseMoney as parse } from "@/lib/form";
import { saveBatchPayment } from "./actions";
import { rememberMethod, useLastMethod } from "./payment-form";

type Row = { id: number; number: number; dueDate: string; balance: string };
const CHARGES = [
  ["penalty", "Multa"],
  ["interest", "Juros"],
  ["discount", "Desconto"],
] as const;

/** Each selected installment is paid in full: saldo + multa + juros − desconto. Date and method are shared. */
export function BatchPaymentForm({ rows, cancelHref }: { rows: Row[]; cancelHref: string }) {
  const [state, action, pending] = useActionState(saveBatchPayment, {});
  // The charge fields drive the totals, so they live in state
  const [values, setValues] = useState<Record<string, string>>({});
  const set = (name: string) => (v: string) => setValues((all) => ({ ...all, [name]: v }));
  useLastMethod(true);

  const totals = rows.map((r) => {
    const [penalty, interest, discount] = CHARGES.map(([k]) => parse(values[`${k}_${r.id}`] ?? ""));
    return penalty && interest && discount ? money(r.balance).plus(penalty).plus(interest).minus(discount) : null;
  });
  const total = totals.every(Boolean) ? totals.reduce<Money>((sum, t) => sum.plus(t!), money(0)) : null;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    rememberMethod(formData);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={{ paidAt: today() }}>
        <Fieldset legend="Pagamento" description="Vale para todas as parcelas abaixo; cada uma é quitada pelo saldo total.">
          <TextField name="paidAt" label="Data do pagamento" type="date" />
          <SelectField name="method" label="Forma de pagamento" options={PAYMENT_METHODS} />
          <TextField name="notes" label="Observações" maxLength={200} optional className="sm:col-span-2" />
        </Fieldset>
        {rows.map((r, i) => (
          <fieldset key={r.id} className="grid gap-x-4 gap-y-3 rounded-lg border border-gray-200 bg-white p-4 sm:grid-cols-3">
            <legend className="px-1.5 text-base font-semibold text-gray-900">{r.number}ª parcela</legend>
            <input type="hidden" name="installment" value={r.id} />
            <input type="hidden" name={`balance_${r.id}`} value={r.balance} />
            <p className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-700 tabular-nums sm:col-span-3">
              <span>venc. {formatDate(r.dueDate)}</span>
              {r.dueDate < today() && <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-800">vencida: confira multa e juros</span>}
              <span>
                saldo <strong className="font-semibold text-gray-900">R$ {formatMoney(r.balance)}</strong>
              </span>
              <span className="sm:ml-auto">
                a receber <strong className="font-semibold text-gray-900">{totals[i] ? `R$ ${formatMoney(totals[i])}` : "—"}</strong>
              </span>
            </p>
            {CHARGES.map(([k, label]) => (
              <TextField
                key={k}
                name={`${k}_${r.id}`}
                label={`${label} (R$)`}
                type="number"
                step="0.01"
                optional
                placeholder="0,00"
                value={values[`${k}_${r.id}`] ?? ""}
                onChange={set(`${k}_${r.id}`)}
              />
            ))}
          </fieldset>
        ))}
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref={cancelHref}
        sticky
        label={total ? `Registrar ${rows.length} ${rows.length === 1 ? "baixa" : "baixas"} · R$ ${formatMoney(total)}` : "Registrar baixas"}
      />
    </form>
  );
}
