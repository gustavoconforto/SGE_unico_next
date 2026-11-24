"use client";

import { startTransition, useActionState, useState } from "react";
import { Combobox } from "@/components/combobox";
import { InstallmentTable } from "@/components/installment-table";
import {
  CheckOption,
  FieldMessage,
  Fieldset,
  FormButtons,
  FormFields,
  SelectField,
  TextField,
  useField,
} from "@/components/form-fields";
import {
  ENDED_EARLY,
  ENROLLMENT_STATUSES,
  contractValues,
  enrollmentInstallments,
  formatMoney,
  lopsidedInstallment,
  money,
  today,
} from "@/lib/finance";
import { createEnrollment } from "./actions";
import { type ClassOption, type EnrollmentTypeOption, classesFor } from "./data-client";

const NEW_STATUSES = ENROLLMENT_STATUSES.filter(([key]) => !ENDED_EARLY.includes(key));

type DiscountTypeOption = { id: number; description: string; percentage: string };
type Props = {
  studentId: number | null;
  students: [number, string][];
  types: EnrollmentTypeOption[];
  classes: ClassOption[];
  discountTypes: DiscountTypeOption[];
};

const GROUPS = [
  [
    "first",
    "Descontos da 1ª parcela",
    "da 1ª parcela",
    "A 1ª parcela é 1/12 do contrato. Os percentuais são somados; use o desconto avulso para um percentual fora da tabela, com a justificativa.",
  ],
  [
    "remaining",
    "Descontos das demais parcelas",
    "das demais parcelas",
    "Os outros 11/12 do contrato, divididos pelos meses restantes. Podem repetir os descontos da 1ª parcela, ser outros ou nenhum.",
  ],
] as const;

/** Percent typed as "5,5" or "5.5"; 0 while blank or not a number. */
function percent(v: string) {
  const n = Number(v.trim().replace(",", "."));
  return Number.isFinite(n) && n > 0 ? money(v.trim().replace(",", ".")) : money(0);
}

export function EnrollmentNewForm({ studentId, students, types, classes, discountTypes }: Props) {
  const [state, action, pending] = useActionState(createEnrollment, {});
  // The fields the billing summary depends on live in state so it updates as they change
  const [typeId, setTypeId] = useState("");
  const [dueDay, setDueDay] = useState("10");
  const [selected, setSelected] = useState<Record<string, number[]>>({ first: [], remaining: [] });
  const [custom, setCustom] = useState<Record<string, string>>({ first: "", remaining: "" });

  const type = types.find((t) => String(t.id) === typeId);
  const percentOf = (group: string) =>
    discountTypes
      .filter((d) => selected[group].includes(d.id))
      .reduce((sum, d) => sum.plus(money(d.percentage)), percent(custom[group]));
  const day = Number(dueDay);
  const validDay = Number.isInteger(day) && day >= 1 && day <= 28;
  const firstPct = percentOf("first");
  const remainingPct = percentOf("remaining");
  // Same functions the server uses to save, so the summary is exactly what gets created
  const values =
    type && validDay && firstPct.lte(100) && remainingPct.lte(100)
      ? contractValues(type.totalPrice, firstPct, remainingPct)
      : null;
  const installments = values && type ? enrollmentInstallments(values, today(), type.schoolYear, day) : [];
  const heaviest = values ? lopsidedInstallment(installments, values.net) : null;
  // Monthly dates off the chosen day were moved off a weekend; the one due on enrollment day is not monthly
  const shifted = new Set(
    installments.filter((i) => i.dueDate !== today() && Number(i.dueDate.slice(8)) !== day).map((i) => i.number),
  );
  // The tick confirms one set of values: a different heaviest installment needs a new confirmation
  const lopsided = heaviest && values ? `${heaviest.number}:${heaviest.amount.toFixed(2)}` : "";
  const [confirmedFor, setConfirmedFor] = useState("");
  const confirmed = !!lopsided && confirmedFor === lopsided;

  // Submitted by hand so React doesn't reset the controlled fields above
  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  const n = installments.length;
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4 lg:max-w-6xl">
      <FormFields state={state} defaults={{ status: "A", studentId }}>
        {/* Wide screens keep the summary beside the fields it depends on */}
        <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
          <div className="flex min-w-0 flex-col gap-4">
            <Fieldset legend="Matrícula" description="Aluno, contrato e turma do ano letivo.">
              <Combobox
                name="studentId"
                label="Aluno"
                className="sm:col-span-2"
                placeholder="Buscar aluno pelo nome…"
                options={students.map(([id, name]) => ({ value: String(id), label: name }))}
              />
              <SelectField
                name="enrollmentTypeId"
                label="Tipo de contrato"
                options={types.map((t) => [t.id, `${t.label} · R$ ${formatMoney(t.totalPrice)}`] as const)}
                value={typeId}
                onChange={setTypeId}
                className="sm:col-span-2"
              />
              {/* key: the class options depend on the contract */}
              <SelectField
                key={typeId}
                name="schoolClassId"
                label="Turma"
                options={classesFor(classes, type).map((c) => [c.id, c.label] as const)}
                optional
                emptyLabel={type ? "Sem turma por enquanto" : "Escolha o contrato primeiro"}
              />
              {/* Transferida, Desistente and Cancelada end an enrollment early: they mean nothing for one not yet created */}
              <SelectField
                name="status"
                label="Situação"
                options={NEW_STATUSES}
                help="Uma matrícula nova normalmente começa como Ativa."
              />
            </Fieldset>

            <Fieldset
              legend="Cobrança"
              description="As parcelas vencem nesse dia de cada mês. Quando ele cai num sábado ou domingo, a parcela vence na segunda-feira seguinte."
            >
              <TextField
                name="dueDay"
                label="Dia de vencimento"
                type="number"
                min={1}
                max={28}
                inputMode="numeric"
                value={dueDay}
                onChange={setDueDay}
                help="Até 28, para existir em todos os meses"
              />
            </Fieldset>

            {GROUPS.map(([group, legend, which, help]) => {
              const listError = state.errors?.[`${group}DiscountTypes`]?.[0];
              return (
                <Fieldset key={group} legend={legend} description={help}>
                  <div
                    role="group"
                    aria-label={legend}
                    aria-describedby={listError ? `${group}DiscountTypes-error` : undefined}
                    className="grid gap-x-4 sm:col-span-2 sm:grid-cols-2"
                  >
                    {discountTypes.map((d) => (
                      <CheckOption
                        key={d.id}
                        id={`${group}-${d.id}`}
                        name={`${group}DiscountTypes`}
                        value={d.id}
                        checked={selected[group].includes(d.id)}
                        onChange={(e) =>
                          setSelected((all) => ({
                            ...all,
                            [group]: e.target.checked ? [...all[group], d.id] : all[group].filter((x) => x !== d.id),
                          }))
                        }
                        label={
                          <>
                            {d.description}
                            {/* The space sits inside the span so the accessible name never reads "ANTIGO20,00%" */}
                            <span className="font-normal text-gray-600 tabular-nums">{` ${formatMoney(d.percentage)}%`}</span>
                          </>
                        }
                      />
                    ))}
                    <div className="sm:col-span-2">
                      <FieldMessage name={`${group}DiscountTypes`} error={listError} />
                    </div>
                  </div>
                  <TextField
                    name={`${group}CustomPercent`}
                    label={
                      <>
                        Desconto avulso (%)<span className="sr-only"> {which}</span>
                      </>
                    }
                    type="number"
                    step="0.01"
                    optional
                    placeholder="0,00"
                    value={custom[group]}
                    onChange={(v) => setCustom((all) => ({ ...all, [group]: v }))}
                  />
                  {/* Required by the server once a custom % is typed */}
                  <TextField
                    name={`${group}CustomObservation`}
                    label={
                      <>
                        Justificativa do desconto avulso<span className="sr-only"> {which}</span>
                      </>
                    }
                    maxLength={200}
                    optional={!custom[group].trim()}
                    help={
                      custom[group].trim()
                        ? "Quem autorizou ou o motivo. Ex.: autorizado pela direção"
                        : "Ex.: autorizado pela direção"
                    }
                  />
                </Fieldset>
              );
            })}
          </div>

          <section
            className="rounded-lg border border-gray-200 bg-white p-4 sm:p-5 lg:sticky lg:top-20 lg:max-h-[calc(100dvh-10rem)] lg:overflow-y-auto"
            aria-labelledby="billing-summary"
          >
            <h2 id="billing-summary" className="text-base font-semibold text-gray-900">
              Resumo da cobrança
            </h2>
            <p className="mb-4 text-sm text-gray-600">
              Confira os valores: ao salvar, a conta e estas parcelas são criadas.
            </p>
            {!type || !validDay ? (
              <p className="text-sm text-gray-600">
                Escolha o contrato e o dia de vencimento para ver as parcelas que serão geradas.
              </p>
            ) : !values ? (
              <p className="text-sm text-red-700">
                Os descontos passam de 100% ou o dia de vencimento é inválido. Corrija para ver as parcelas.
              </p>
            ) : (
              <>
                {/* Only the totals are announced as they change, not the whole table */}
                <dl
                  className="mb-4 grid grid-cols-3 gap-3 border-b border-gray-200 pb-4 lg:grid-cols-1 lg:gap-1.5 lg:[&>div]:flex lg:[&>div]:items-baseline lg:[&>div]:justify-between"
                  aria-live="polite"
                >
                  <div>
                    <dt className="text-sm text-gray-600">Contrato</dt>
                    <dd className="text-sm font-medium tabular-nums">R$ {formatMoney(values.gross)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">Descontos</dt>
                    <dd className="text-sm font-medium tabular-nums">− R$ {formatMoney(values.discount)}</dd>
                  </div>
                  <div>
                    <dt className="text-sm text-gray-600">A receber</dt>
                    <dd className="text-lg font-semibold text-gray-900 tabular-nums">R$ {formatMoney(values.net)}</dd>
                  </div>
                </dl>
                {heaviest && (
                  // Not a live alert: it would be read out again on every change to the amounts
                  <div className="mb-4 rounded-lg bg-yellow-50 p-4 text-sm text-yellow-800">
                    <p id="lopsided-warning">
                      A {heaviest.number}ª parcela concentra R$ {formatMoney(heaviest.amount)},{" "}
                      {heaviest.amount.div(values.net).times(100).toFixed(0)}% do valor a receber: os 11/12 restantes do
                      contrato ficam em só {n - 1} {n - 1 === 1 ? "parcela" : "parcelas"} até o fim do ano letivo.
                      Confirme com o responsável antes de salvar.
                    </p>
                    <ConfirmLopsided checked={confirmed} onChange={(on) => setConfirmedFor(on ? lopsided : "")} />
                  </div>
                )}
                <InstallmentTable rows={installments} shifted={shifted} />
              </>
            )}
          </section>
        </div>
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/enrollments"
        sticky
        note={
          // Phones show the summary far below this bar: point to the warning before staff commit
          heaviest && values && !confirmed ? (
            <button
              type="button"
              className="flex min-h-10 items-center gap-1.5 text-left text-sm font-medium text-yellow-800 underline underline-offset-4 lg:hidden"
              onClick={() => document.getElementById("confirmLopsided")?.focus()}
            >
              <span className="material-symbols-outlined text-yellow-700" aria-hidden="true">
                warning
              </span>
              A {heaviest.number}ª parcela concentra {heaviest.amount.div(values.net).times(100).toFixed(0)}% do valor:
              confirme no resumo
            </button>
          ) : undefined
        }
        label={n ? `Criar matrícula e ${n} parcela${n === 1 ? "" : "s"}` : "Criar matrícula"}
      />
    </form>
  );
}

/** The lopsided-contract tick: controlled, so it clears when the flagged installment changes. */
function ConfirmLopsided({ checked, onChange }: { checked: boolean; onChange: (checked: boolean) => void }) {
  const { error } = useField("confirmLopsided");
  return (
    <div className="mt-3">
      <CheckOption
        id="confirmLopsided"
        name="confirmLopsided"
        label="Confirmei estes valores com o responsável"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        aria-invalid={!!error}
        aria-describedby={error ? "lopsided-warning confirmLopsided-error" : "lopsided-warning"}
        // scroll margin: focus from the sticky bar's link must not land under the bar
        className={`scroll-mb-28 ${error ? "border-red-600 ring-1 ring-red-600" : ""}`}
      />
      <FieldMessage name="confirmLopsided" error={error} />
    </div>
  );
}
