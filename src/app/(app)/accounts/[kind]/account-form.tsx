"use client";

import { startTransition, useActionState, useState } from "react";
import { Combobox } from "@/components/combobox";
import { InstallmentTable } from "@/components/installment-table";
import { Fieldset, FormButtons, FormFields, SelectField, TextField, TextareaField } from "@/components/form-fields";
import { accountInstallments, formatMoney, today } from "@/lib/finance";
import { parseMoney } from "@/lib/form";
import type { Kind } from "../kinds";
import { createAccount, updateAccount } from "./actions";
import type { AccountFormOptions } from "./options";

type Props = {
  kind: Kind;
  id?: number;
  defaults?: Record<string, unknown>;
  options: AccountFormOptions;
  /** The contract account belongs to its enrollment's student. */
  enrollmentLabel?: string;
  cancelHref: string;
};

export function AccountForm({ kind, id, defaults, options, enrollmentLabel, cancelHref }: Props) {
  const editing = id !== undefined;
  const [state, action, pending] = useActionState(
    editing ? updateAccount.bind(null, kind, id) : createAccount.bind(null, kind),
    {},
  );
  // The guardian options follow the student (Django's receivable_guardian_options endpoint)
  const [studentId, setStudentId] = useState(String(defaults?.studentId ?? ""));
  const [guardianId, setGuardianId] = useState(String(defaults?.guardianId ?? ""));
  const financial = studentId ? (options.financialByStudent[Number(studentId)] ?? []) : null;
  const guardianChoices = financial ? options.guardians.filter(([gid]) => financial.includes(gid)) : options.guardians;

  // The values decide the installments created, and can't change after saving: preview them with the server's split
  const [split, setSplit] = useState({
    gross: String(defaults?.grossValue ?? ""),
    discount: "",
    count: "1",
    first: today(),
  });
  const setPart = (key: keyof typeof split) => (v: string) => setSplit((all) => ({ ...all, [key]: v }));
  const gross = parseMoney(split.gross);
  const discount = parseMoney(split.discount);
  const count = Number(split.count);
  const net = gross && discount ? gross.minus(discount) : null;
  const preview =
    !editing &&
    net?.gt(0) &&
    Number.isInteger(count) &&
    count >= 1 &&
    count <= 120 &&
    /^\d{4}-\d{2}-\d{2}$/.test(split.first)
      ? accountInstallments(net, count, split.first)
      : [];
  const n = preview.length;

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <FormFields
        state={state}
        defaults={{ issueDate: today(), firstDueDate: today(), installmentsCount: "1", ...defaults }}
      >
        <Fieldset legend="Conta" description="O que está sendo cobrado ou pago, e de quem.">
          <TextField name="description" label="Descrição" maxLength={200} className="sm:col-span-2" />
          <SelectField name="categoryId" label="Categoria" options={options.categories} />
          <TextField name="issueDate" label="Data de emissão" type="date" />
          {kind === "payable" ? (
            <SelectField name="supplierId" label="Fornecedor" options={options.suppliers} optional />
          ) : (
            <>
              {enrollmentLabel ? (
                <div>
                  <p className="mb-1.5 text-sm font-medium text-gray-900">Matrícula</p>
                  <p className="text-sm">{enrollmentLabel}</p>
                  <input type="hidden" name="studentId" value={studentId} />
                </div>
              ) : (
                <Combobox
                  name="studentId"
                  label="Aluno"
                  optional
                  placeholder="Buscar aluno pelo nome…"
                  options={options.students.map(([sid, name]) => ({ value: String(sid), label: name }))}
                  value={studentId}
                  onChange={(v) => {
                    setStudentId(v);
                    const first = v ? options.financialByStudent[Number(v)]?.[0] : undefined;
                    setGuardianId(first ? String(first) : "");
                  }}
                />
              )}
              <Combobox
                name="guardianId"
                label="Responsável financeiro"
                optional
                placeholder="Buscar responsável pelo nome…"
                options={guardianChoices.map(([gid, name]) => ({ value: String(gid), label: name }))}
                value={guardianId}
                onChange={setGuardianId}
                help={financial ? "Somente os responsáveis financeiros do aluno" : undefined}
                emptyText={financial ? "Este aluno não tem responsável financeiro cadastrado." : undefined}
              />
            </>
          )}
          <TextareaField name="notes" label="Observações" optional className="sm:col-span-2" />
        </Fieldset>
        <Fieldset legend="Valores">
          {editing ? (
            <>
              <TextField name="grossValue" label="Valor bruto (R$)" type="number" step="0.01" disabled />
              <TextField name="discountValue" label="Desconto (R$)" type="number" step="0.01" disabled />
            </>
          ) : (
            <>
              <TextField
                name="grossValue"
                label="Valor bruto (R$)"
                type="number"
                step="0.01"
                value={split.gross}
                onChange={setPart("gross")}
              />
              <TextField
                name="discountValue"
                label="Desconto (R$)"
                type="number"
                step="0.01"
                optional
                placeholder="0,00"
                value={split.discount}
                onChange={setPart("discount")}
              />
            </>
          )}
          {editing ? (
            <p className="text-sm text-gray-600 sm:col-span-2">
              Os valores já foram divididos em parcelas e não podem ser alterados.
            </p>
          ) : (
            <>
              <TextField
                name="installmentsCount"
                label="Número de parcelas"
                type="number"
                min={1}
                max={120}
                inputMode="numeric"
                value={split.count}
                onChange={setPart("count")}
              />
              <TextField
                name="firstDueDate"
                label="Primeiro vencimento"
                type="date"
                value={split.first}
                onChange={setPart("first")}
              />
              <div className="sm:col-span-2">
                {n ? (
                  <>
                    <p className="mb-2 text-sm text-gray-600" aria-live="polite">
                      Ao salvar, {n === 1 ? "esta parcela é criada" : `estas ${n} parcelas são criadas`}, somando R${" "}
                      {formatMoney(net)}. Os valores não poderão ser alterados depois.
                    </p>
                    <InstallmentTable rows={preview} />
                  </>
                ) : (
                  <p className="text-sm text-gray-600" aria-live="polite">
                    Informe o valor, o número de parcelas e o primeiro vencimento para ver as parcelas que serão
                    criadas.
                  </p>
                )}
              </div>
            </>
          )}
        </Fieldset>
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref={cancelHref}
        sticky
        label={
          editing
            ? "Salvar alterações"
            : `${kind === "payable" ? "Criar conta a pagar" : "Criar conta a receber"}${n ? ` e ${n} parcela${n === 1 ? "" : "s"}` : ""}`
        }
      />
    </form>
  );
}
