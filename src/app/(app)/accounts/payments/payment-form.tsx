"use client";

import { startTransition, useActionState, useEffect, useRef, useState } from "react";
import { type ComboOption, Combobox } from "@/components/combobox";
import { Fieldset, FormButtons, FormFields, SelectField, TextField } from "@/components/form-fields";
import { PAYMENT_METHODS, type PaymentValues, formatDate, formatMoney, money, principal, today } from "@/lib/finance";
import { parseMoney as parse } from "@/lib/form";
import { savePayment, searchInstallments } from "./actions";
import type { InstallmentChoice } from "./data";

type Props = {
  id?: number;
  direction: "R" | "P";
  returnToAccount: boolean;
  defaults?: Record<string, unknown>;
  selected?: InstallmentChoice | null;
  cancelHref: string;
};

const PLACEHOLDERS = { R: "Buscar por conta ou responsável…", P: "Buscar por conta, fornecedor ou CPF/CNPJ…" };
const LAST_METHOD = "gestao:last-payment-method";
const MONEY_FIELDS = ["amount", "discount", "penalty", "interest", "monetaryAdjust"] as const;
const ADJUSTMENTS = [
  ["penalty", "Multa"],
  ["interest", "Juros"],
  ["monetaryAdjust", "Correção"],
] as const;

const PARTY = { R: "Responsável", P: "Fornecedor" };
const DAY = 86_400_000;
/** Days past due (0 when not overdue): with most receivables overdue, "how late" is what tells them apart. */
const daysLate = (c: InstallmentChoice) => Math.max(0, Math.round((Date.parse(today()) - Date.parse(c.dueDate)) / DAY));
const lateBadge = (c: InstallmentChoice) => {
  const n = daysLate(c);
  return n ? `vencida há ${n} ${n === 1 ? "dia" : "dias"}` : undefined;
};
/** "Contrato Ana - Ensino Médio - 1ª Série - 2026" → who first; the course and year go to the second line. */
const split = (label: string) => {
  const [account, number] = label.split(" · ");
  const cut = account.indexOf(" - ");
  return cut < 0 ? { title: label, rest: "" } : { title: `${account.slice(0, cut)} · ${number}`, rest: account.slice(cut + 3) };
};
/** Course, due date and payer on their own line. */
const details = (c: InstallmentChoice, direction: "R" | "P") =>
  [split(c.label).rest, `venc. ${formatDate(c.dueDate)}`, c.party && `${PARTY[direction]}: ${c.party}`].filter(Boolean).join(" · ");
const toOption = (direction: "R" | "P") => (c: InstallmentChoice): ComboOption => ({
  value: String(c.id),
  label: split(c.label).title,
  hint: details(c, direction),
  badge: lateBadge(c),
  detail: `saldo R$ ${formatMoney(c.balance)}`,
});
/** "1234.50" → "1.234,50", the way the balance is shown. */
const typed = (v: unknown) => (v == null || v === "" ? "" : formatMoney(String(v)));

export function PaymentForm({ id, direction, returnToAccount, defaults = {}, selected, cancelHref }: Props) {
  const [state, action, pending] = useActionState(savePayment.bind(null, id ?? null, direction, returnToAccount), {});
  const [installment, setInstallment] = useState<InstallmentChoice | null>(selected ?? null);
  const seen = useRef(new Map<string, InstallmentChoice>(selected ? [[String(selected.id), selected]] : []));
  // The money fields drive the balance line, so they live in state; zero adjustments start blank
  const [values, setValues] = useState<Record<string, string>>(() =>
    Object.fromEntries(MONEY_FIELDS.map((k) => [k, k !== "amount" && money(String(defaults[k] || 0)).isZero() ? "" : typed(defaults[k])])),
  );
  const set = (name: string) => (v: string) => setValues((all) => ({ ...all, [name]: v }));
  // Valor pago follows saldo + acréscimos − desconto until staff type their own amount (an edit starts typed)
  const [amountTyped, setAmountTyped] = useState(!!id);
  // The amount error may ask for the adjustments, so open them then too
  // An overdue installment usually owes multa and juros: open them with a reminder (staff still type the amounts)
  const late = installment ? daysLate(installment) : 0;
  const showAdjustments = !!late || !!state.errors?.amount || ADJUSTMENTS.some(([name]) => state.errors?.[name] || values[name]);

  // A new payment starts with the method this person used last (per browser; nothing else depends on it)
  useEffect(() => {
    const select = document.getElementById("method") as HTMLSelectElement | null;
    if (id || !select || select.value) return;
    try {
      const last = localStorage.getItem(LAST_METHOD);
      if (last && PAYMENT_METHODS.some(([code]) => code === last)) select.value = last;
    } catch {}
  }, [id]);

  // On edit, the server's balance already excludes this payment: add it back while the installment is unchanged
  const original = id && selected && installment?.id === selected.id ? principal(Object.fromEntries(MONEY_FIELDS.map((k) => [k, String(defaults[k] || 0)])) as PaymentValues) : money(0);
  const balance = installment ? money(installment.balance).plus(original) : null;
  // What settles the installment: principal(amount) = balance ⇔ amount = balance + multa + juros + correção − desconto
  const charges = ADJUSTMENTS.map(([k]) => parse(values[k]));
  const discount = parse(values.discount);
  const total = balance && discount && charges.every(Boolean) ? charges.reduce((sum, c) => sum!.plus(c!), balance)!.minus(discount) : null;
  const hasCharges = charges.some((c) => c && !c.isZero());
  const amountValue = !amountTyped && total?.gt(0) ? typed(total.toFixed(2)) : values.amount;

  const parsed = Object.fromEntries(MONEY_FIELDS.map((k) => [k, parse(k === "amount" ? amountValue : values[k])]));
  const settles = MONEY_FIELDS.every((k) => parsed[k]) ? principal(parsed as PaymentValues) : null;
  const after = balance && settles ? balance.minus(settles) : null;
  const amount = parsed.amount;

  // Submitted by hand so React doesn't reset the installment search
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    try {
      // A blank choice (failed submit) must not erase the remembered one
      const method = String(formData.get("method") ?? "");
      if (method) localStorage.setItem(LAST_METHOD, method);
    } catch {}
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields state={state} defaults={{ paidAt: today(), ...defaults }}>
        <Fieldset legend="Parcela" description="A parcela que está sendo quitada, total ou parcialmente.">
          <Combobox
            name="installmentId"
            label="Conta e parcela"
            className="sm:col-span-2"
            placeholder={PLACEHOLDERS[direction]}
            describedBy={installment ? "installment-details" : undefined}
            emptyText="Nenhuma parcela pendente encontrada."
            initial={selected ? toOption(direction)(selected) : null}
            search={async (q) => {
              const rows = await searchInstallments(direction, q);
              for (const r of rows) seen.current.set(String(r.id), r);
              return rows.map(toOption(direction));
            }}
            onChange={(value) => {
              const choice = seen.current.get(value) ?? null;
              setInstallment(choice);
              // The usual case is paying the whole balance: Valor pago follows it again
              setAmountTyped(false);
            }}
          />
          {/* The input shows only the label (cut short on phones): the due date and payer stay visible after the pick */}
          {installment && (
            <p id="installment-details" className="-mt-2 flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700 sm:col-span-2">
              <span>{details(installment, direction)}</span>
              {late > 0 && <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-800">{` ${lateBadge(installment)}`}</span>}
            </p>
          )}
          {balance && (
            <dl className="grid grid-cols-2 gap-3 rounded-md bg-gray-50 px-3 py-2.5 text-sm sm:col-span-2">
              <div>
                <dt className="text-gray-600">Saldo da parcela</dt>
                <dd className="text-base font-semibold tabular-nums">R$ {formatMoney(balance)}</dd>
              </div>
              <div aria-live="polite">
                <dt className="text-gray-600">Saldo após esta baixa</dt>
                <dd className={`text-base font-semibold tabular-nums ${after?.isNegative() ? "text-red-700" : after?.isZero() ? "text-green-700" : ""}`}>
                  {after === null ? "—" : after.isNegative() ? `Excede em R$ ${formatMoney(after.abs())}` : after.isZero() ? "R$ 0,00 · quitada" : `R$ ${formatMoney(after)}`}
                </dd>
              </div>
            </dl>
          )}
        </Fieldset>
        <Fieldset legend="Valores">
          <TextField name="paidAt" label="Data do pagamento" type="date" />
          <SelectField name="method" label="Forma de pagamento" options={PAYMENT_METHODS} />
          <TextField
            name="amount"
            label="Valor pago (R$)"
            type="number"
            step="0.01"
            value={amountValue}
            onChange={(v) => {
              setAmountTyped(true);
              set("amount")(v);
            }}
            help="Total recebido. Acompanha o saldo, os acréscimos e o desconto até você digitar outro valor"
          />
          <TextField
            name="discount"
            label="Desconto (R$)"
            type="number"
            step="0.01"
            optional
            placeholder="0,00"
            value={values.discount}
            onChange={set("discount")}
            help="Ex.: pontualidade; abate do saldo"
          />
          {/* key: a newly picked overdue installment opens it again, even if staff closed it for the last one */}
          <details key={installment?.id} open={showAdjustments || undefined} className="group sm:col-span-2">
            <summary className="flex min-h-10 w-fit cursor-pointer list-none items-center gap-1 rounded-md text-sm font-medium text-blue-700 hover:underline [&::-webkit-details-marker]:hidden">
              <span className="material-symbols-outlined transition-transform group-open:rotate-90" aria-hidden="true">
                chevron_right
              </span>
              Acréscimos: multa, juros e correção
            </summary>
            {late > 0 && installment && (
              <p className="mt-2 text-sm text-gray-700">Parcela vencida desde {formatDate(installment.dueDate)}: confira multa e juros.</p>
            )}
            <div className="mt-3 grid gap-4 sm:grid-cols-3">
              {ADJUSTMENTS.map(([name, label]) => (
                <TextField key={name} name={name} label={`${label} (R$)`} type="number" step="0.01" optional placeholder="0,00" value={values[name]} onChange={set(name)} />
              ))}
            </div>
            {hasCharges && total && (
              <p className="mt-3 text-sm text-gray-700">
                Total a receber com os acréscimos: <strong className="font-semibold text-gray-900 tabular-nums">R$ {formatMoney(total)}</strong>
                {amountTyped && !after?.isZero() && " (diferente do valor pago)"}
              </p>
            )}
          </details>
          <TextField name="notes" label="Observações" maxLength={200} optional className="sm:col-span-2" />
        </Fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref={cancelHref} sticky label={id ? "Salvar baixa" : amount && amount.gt(0) ? `Registrar baixa de R$ ${formatMoney(amount)}` : "Registrar baixa"} />
    </form>
  );
}
