"use client";

import { HelperText, Select, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { useActionState, useState } from "react";
import { FormButtons, FormFields, useField } from "@/components/form-fields";
import { PERIODS, WEEKDAYS, weekdayPeriods } from "@/lib/lessons";
import { saveTimetable } from "./actions";

export function TimetableForm({ classId, choices, initial }: { classId: number; choices: [string, string][]; initial: Record<string, string> }) {
  const [state, action, pending] = useActionState(saveTimetable.bind(null, classId), {});
  // Six days don't fit full "Matéria — Professor" labels, so the teacher goes on a line under the select
  const teacherOf = new Map(choices.map(([v, l]) => [v, l.slice(l.lastIndexOf(" — ") + 3)]));
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormFields state={state} defaults={initial}>
        <p className="text-sm text-gray-600">Escolha a matéria e o professor de cada aula; deixe em branco os horários sem aula.</p>
        <div className="overflow-x-auto">
          <Table>
            <TableHead>
              <TableRow>
                <TableHeadCell>Aula</TableHeadCell>
                {WEEKDAYS.map(([d, l]) => (
                  <TableHeadCell key={d}>{l}</TableHeadCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {PERIODS.map(([period, label]) => (
                <TableRow key={period}>
                  <TableCell className="whitespace-nowrap">{label}</TableCell>
                  {WEEKDAYS.map(([weekday]) => {
                    const name = `slot_${weekday}_${period}`;
                    if (period > weekdayPeriods(weekday).length) return <TableCell key={weekday} className="bg-gray-100" />;
                    return (
                      <TableCell key={weekday} className="min-w-36 px-1 align-top">
                        <Slot name={name} label={`${WEEKDAYS[weekday - 1][1]}, ${label}`} choices={choices} teacherOf={teacherOf} />
                      </TableCell>
                    );
                  })}
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </FormFields>
      <FormButtons pending={pending} cancelHref={`/lessons/timetable?school_class=${classId}`} label="Salvar grade horária" sticky />
    </form>
  );
}

/** One lesson's select; its error and value come from <FormFields>, so it clears when edited. */
function Slot({ name, label, choices, teacherOf }: { name: string; label: string; choices: [string, string][]; teacherOf: Map<string, string> }) {
  const { error, value, a11y } = useField(name);
  const [picked, setPicked] = useState(value);
  return (
    <>
      {/* key: React won't re-apply a changed defaultValue on <select> after a failed submit */}
      <Select key={value} name={name} defaultValue={value} sizing="sm" aria-label={label} color={error ? "failure" : undefined} onChange={(e) => setPicked(e.target.value)} {...a11y}>
        <option value="">—</option>
        {choices.map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <span className="mt-1 block min-h-4 px-1 text-xs text-gray-600">{teacherOf.get(picked)}</span>
      {error && (
        <HelperText id={`${name}-error`} color="failure">
          {error}
        </HelperText>
      )}
    </>
  );
}
