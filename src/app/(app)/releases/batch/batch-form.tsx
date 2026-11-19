"use client";

import { Checkbox, Label, TextInput } from "flowbite-react";
import { startTransition, useActionState, useState } from "react";
import { CheckOption, FormButtons, FormFields } from "@/components/form-fields";
import { saveBatchExits } from "../actions";

const fold = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "").toLowerCase();

type Props = { exitDate: string; schoolYearId: number; reasonId: number; students: [number, string][] };

/** The active students of the year, A→Z; the name filter only hides rows, so checked students stay checked. */
export function BatchExitForm({ exitDate, schoolYearId, reasonId, students }: Props) {
  const [state, action, pending] = useActionState(saveBatchExits, {});
  const [query, setQuery] = useState("");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const visible = students.filter(([, name]) => fold(name).includes(fold(query.trim())));
  const shown = new Set(visible.map(([id]) => id));
  const allVisible = visible.length > 0 && visible.every(([id]) => checked.has(id));

  function toggle(ids: number[], on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      for (const id of ids) {
        if (on) next.add(id);
        else next.delete(id);
      }
      return next;
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  if (!students.length) return <p className="text-sm text-gray-700">Nenhum aluno com matrícula ativa neste ano letivo.</p>;
  return (
    <form onSubmit={onSubmit} className="flex max-w-3xl flex-col gap-4">
      <input type="hidden" name="exitDate" value={exitDate} />
      <input type="hidden" name="schoolYearId" value={schoolYearId} />
      <input type="hidden" name="reasonId" value={reasonId} />
      <FormFields state={state}>
        <div>
          <Label htmlFor="student-filter">Filtrar por nome</Label>
          <TextInput id="student-filter" type="search" value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Digite parte do nome…" autoComplete="off" />
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
          <label htmlFor="select-visible" className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-900">
            <Checkbox id="select-visible" checked={allVisible} disabled={!visible.length} onChange={(e) => toggle(visible.map(([id]) => id), e.target.checked)} />
            {query.trim() ? "Selecionar os alunos filtrados" : "Selecionar todos"}
          </label>
          <span className="text-sm text-gray-600" aria-live="polite">
            {checked.size} de {students.length} selecionado{checked.size === 1 ? "" : "s"}
          </span>
        </div>
        <fieldset>
          <legend className="sr-only">Alunos</legend>
          {students.map(([id, label]) => {
            const [name, ...rest] = label.split(" - ");
            return (
              <div key={id} hidden={!shown.has(id)}>
                <CheckOption
                  id={`enrollment-${id}`}
                  name="enrollmentId"
                  value={id}
                  checked={checked.has(id)}
                  onChange={(e) => toggle([id], e.target.checked)}
                  label={
                    <>
                      {name} <span className="font-normal text-gray-600">{rest.join(" - ")}</span>
                    </>
                  }
                />
              </div>
            );
          })}
          {!visible.length && <p className="text-sm text-gray-700">Nenhum aluno encontrado com este nome.</p>}
        </fieldset>
      </FormFields>
      <FormButtons pending={pending} cancelHref="/releases" sticky label={`Registrar ${checked.size ? `${checked.size} ` : ""}liberaç${checked.size === 1 ? "ão" : "ões"}`} />
    </form>
  );
}
