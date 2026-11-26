"use client";

import { Checkbox, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { startTransition, useActionState, useState } from "react";
import { FormButtons, FormFields } from "@/components/form-fields";
import { BATHROOM_PERIODS } from "@/lib/incidents";
import { saveBatchRecords } from "../actions";

const PERIODS = Array.from({ length: BATHROOM_PERIODS }, (_, i) => i + 1);

type Props = { incidentDate: string; schoolClassId: number; students: [number, string][] };

/** The class's active students × the first periods; each checked cell is one bathroom pass. */
export function BatchBathroomForm({ incidentDate, schoolClassId, students }: Props) {
  const [state, action, pending] = useActionState(saveBatchRecords, {});
  const [checked, setChecked] = useState<Set<string>>(new Set());

  function toggle(cell: string, on: boolean) {
    setChecked((prev) => {
      const next = new Set(prev);
      if (on) next.add(cell);
      else next.delete(cell);
      return next;
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    startTransition(() => action(formData));
  }

  if (!students.length) return <p className="text-sm text-gray-700">Nenhum aluno com matrícula ativa nesta turma.</p>;
  return (
    <form onSubmit={onSubmit} className="flex max-w-4xl flex-col gap-4">
      <input type="hidden" name="incidentDate" value={incidentDate} />
      <input type="hidden" name="schoolClassId" value={schoolClassId} />
      <FormFields state={state}>
        <div className="isolate -mx-1 overflow-x-auto px-1 pb-2">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell scope="col" className="px-4">
                  Aluno
                </TableHeadCell>
                {PERIODS.map((p) => (
                  <TableHeadCell key={p} scope="col" className="px-3 text-center whitespace-nowrap">
                    {p}ª aula
                  </TableHeadCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody className="divide-y divide-gray-100">
              {students.map(([id, name]) => (
                <TableRow key={id}>
                  <th scope="row" className="px-4 py-2 text-left font-medium text-gray-900">
                    {name}
                  </th>
                  {PERIODS.map((p) => {
                    const cell = `${id}:${p}`;
                    return (
                      <TableCell key={p} className="px-3 py-2 text-center">
                        <Checkbox
                          name="cell"
                          value={cell}
                          aria-label={`${name}, ${p}ª aula`}
                          checked={checked.has(cell)}
                          onChange={(e) => toggle(cell, e.target.checked)}
                        />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </FormFields>
      <FormButtons
        pending={pending}
        cancelHref="/incidents/bathroom"
        sticky
        label={`Registrar ${checked.size ? `${checked.size} ` : ""}saída${checked.size === 1 ? "" : "s"}`}
      />
    </form>
  );
}
