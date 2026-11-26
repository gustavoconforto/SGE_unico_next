"use client";

import { Checkbox, Label, TextInput } from "flowbite-react";
import { useState } from "react";
import { CheckOption } from "@/components/form-fields";

const fold = (s: string) =>
  s
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();

type Props = {
  students: [number, string][];
  checked: Set<number>;
  onCheckedChange: (checked: Set<number>) => void;
};

/** Checkboxes named `enrollmentId`, one per student; the name filter only hides rows, so checked students stay checked. */
export function StudentChecklist({ students, checked, onCheckedChange }: Props) {
  const [query, setQuery] = useState("");
  const visible = students.filter(([, name]) => fold(name).includes(fold(query.trim())));
  const shown = new Set(visible.map(([id]) => id));
  const allVisible = visible.length > 0 && visible.every(([id]) => checked.has(id));

  function toggle(ids: number[], on: boolean) {
    const next = new Set(checked);
    for (const id of ids) {
      if (on) next.add(id);
      else next.delete(id);
    }
    onCheckedChange(next);
  }

  return (
    <>
      <div>
        <Label htmlFor="student-filter">Filtrar por nome</Label>
        <TextInput
          id="student-filter"
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Digite parte do nome…"
          autoComplete="off"
        />
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-2">
        <label
          htmlFor="select-visible"
          className="flex cursor-pointer items-center gap-2.5 text-sm font-medium text-gray-900"
        >
          <Checkbox
            id="select-visible"
            checked={allVisible}
            disabled={!visible.length}
            onChange={(e) =>
              toggle(
                visible.map(([id]) => id),
                e.target.checked,
              )
            }
          />
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
    </>
  );
}
