"use client";

import { Button } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { Combobox } from "@/components/combobox";
import { CheckOption, SelectField, useField, useMarkFixed } from "@/components/form-fields";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { formatPhone } from "@/lib/person";
import { type GuardianRow, RELATIONSHIPS } from "@/lib/students";

export type GuardianOption = { id: number; name: string; mobile: string };
type Row = Omit<GuardianRow, "guardianId" | "relationship"> & {
  key: number;
  guardianId: number | null;
  relationship: string;
};

const FLAGS = [
  ["isFinancial", "Responsável financeiro"],
  ["isPrimaryContact", "Contato principal"],
  ["livingWith", "Mora com o aluno(a)"],
  ["pickUp", "Autorizado a buscar o aluno"],
] as const;

const blank = (key: number): Row => ({
  key,
  id: null,
  guardianId: null,
  relationship: "",
  isFinancial: false,
  isPrimaryContact: false,
  livingWith: false,
  pickUp: false,
  delete: false,
});

/** Port of the GuardianFormSet: rows are kept in state and posted as JSON in `guardians`. */
export function GuardianRows({
  initial,
  options,
  showWhatsapp,
  children,
}: {
  initial: GuardianRow[];
  options: GuardianOption[];
  showWhatsapp: boolean;
  /** Fields shown above the rows (the "student is self-financial" box). */
  children?: React.ReactNode;
}) {
  // Keys count per form, not per module, so the server render and hydration agree
  const [rows, setRows] = useState<Row[]>(() => [...initial.map((r, i) => ({ ...r, key: i })), blank(initial.length)]);
  const nextKey = useRef(initial.length + 1);
  const markFixed = useMarkFixed();
  // A guardian registered in another tab shows up here when staff come back to this one
  const router = useRouter();
  const registering = useRef(false);
  useEffect(() => {
    const onFocus = () => {
      if (!registering.current) return;
      registering.current = false;
      router.refresh();
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [router]);
  const update = (key: number, patch: Partial<Row>) => {
    markFixed("guardians");
    setRows((all) => all.map((r) => (r.key === key ? { ...r, ...patch } : r)));
  };
  const byId = new Map(options.map((o) => [o.id, o]));
  // A rows error (no financial guardian, a repeated guardian…) is shown on the first active row's picker, where it gets fixed
  const { error } = useField("guardians");
  const firstActive = rows.find((r) => !r.delete)?.key;
  const choices = options.map((o) => ({
    value: String(o.id),
    label: o.name,
    detail: formatPhone(o.mobile) || undefined,
  }));

  return (
    <fieldset className="flex flex-col gap-4 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <legend className="px-1.5 text-base font-semibold text-gray-900">Responsáveis</legend>
      <p className="-mt-2 text-sm text-gray-600">Quem responde pelo aluno, quem paga e quem pode buscá-lo.</p>
      {children}
      <input type="hidden" name="guardians" value={JSON.stringify(rows.map(({ key: _key, ...r }) => r))} />
      {rows.map((row, i) => {
        const name = byId.get(row.guardianId ?? 0)?.name;
        const rowLabel = `Responsável ${i + 1}`;
        const wa = showWhatsapp && row.id && !row.delete ? byId.get(row.guardianId ?? 0)?.mobile : undefined;
        return (
          <div key={row.key} role="group" aria-label={name ? `${rowLabel}: ${name}` : rowLabel} className={`grid gap-4 border-t border-gray-200 pt-4 sm:grid-cols-2 ${row.delete ? "opacity-60" : ""}`}>
            <Combobox
              id={`guardian-${row.key}`}
              label={rowLabel}
              placeholder="Buscar responsável pelo nome…"
              emptyText="Nenhum responsável com esse nome. Use “Cadastrar novo responsável”, abaixo."
              options={choices}
              error={row.key === firstActive ? error : undefined}
              value={row.guardianId ? String(row.guardianId) : ""}
              disabled={row.delete}
              onChange={(v) => update(row.key, { guardianId: v ? Number(v) : null })}
            />
            <SelectField
              name={`relationship-${row.key}`}
              label="Parentesco"
              options={RELATIONSHIPS}
              value={row.relationship}
              disabled={row.delete}
              onChange={(v) => update(row.key, { relationship: v })}
            />
            <div className="grid gap-x-4 sm:col-span-2 sm:grid-cols-2">
              {FLAGS.map(([flag, label]) => (
                <CheckOption
                  key={flag}
                  id={`${flag}-${row.key}`}
                  label={label}
                  checked={row[flag]}
                  disabled={row.delete}
                  // The rows error is usually "no financial guardian": the box that fixes it points to it too
                  aria-describedby={flag === "isFinancial" && row.key === firstActive && error ? `guardian-${row.key}-error` : undefined}
                  onChange={(e) => update(row.key, { [flag]: e.target.checked })}
                />
              ))}
            </div>
            <div className="flex flex-wrap items-center gap-2 sm:col-span-2">
              {wa && <WhatsAppLink phone={wa} who={name} />}
              {row.delete ? (
                <>
                  <span className="text-sm text-gray-600">Responsável removido ao salvar.</span>
                  <Button size="sm" color="alternative" onClick={() => update(row.key, { delete: false })}>
                    Desfazer
                  </Button>
                </>
              ) : (
                (row.id || row.guardianId || row.relationship) && (
                  <Button
                    size="sm"
                    color="red"
                    outline
                    className="ml-auto"
                    aria-label={`Remover ${name ?? rowLabel.toLowerCase()}`}
                    onClick={() => (row.id ? update(row.key, { delete: true }) : setRows((all) => all.filter((r) => r.key !== row.key)))}
                  >
                    Remover
                  </Button>
                )
              )}
            </div>
          </div>
        );
      })}
      <div className="flex flex-wrap gap-2">
        <Button size="sm" color="alternative" onClick={() => setRows((all) => [...all, blank(nextKey.current++)])}>
          <span className="material-symbols-outlined" aria-hidden="true">
            add
          </span>{" "}
          Adicionar responsável
        </Button>
        <Button as="a" href="/guardians/new" target="_blank" rel="noopener" size="sm" color="light" onClick={() => (registering.current = true)}>
          <span className="material-symbols-outlined" aria-hidden="true">
            open_in_new
          </span>{" "}
          Cadastrar novo responsável<span className="sr-only"> (abre em nova aba)</span>
        </Button>
      </div>
    </fieldset>
  );
}
