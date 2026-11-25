"use client";

import { Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { useActionState, useState } from "react";
import { FormButtons, FormFields } from "@/components/form-fields";
import { STATUS_COLOR, STATUS_SHORT } from "@/components/attendance-status";
import { ATTENDANCE_STATUSES } from "@/lib/attendance";
import { saveAttendance } from "../../actions";

type Row = { id: number; student: string; className: string; status: string };

export function AttendanceForm({
  sessionId,
  rows,
  cancelHref,
}: {
  sessionId: number;
  rows: Row[];
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveAttendance.bind(null, sessionId), {});
  const [statuses, setStatuses] = useState<Record<number, string>>(() =>
    Object.fromEntries(rows.map((r) => [r.id, r.status])),
  );
  if (!rows.length) return <p className="text-gray-600">Nenhum aluno inscrito no itinerário na data desta aula.</p>;

  const count = (s: string) => rows.filter((r) => statuses[r.id] === s).length;
  const absent = count("F");
  const excused = count("J");
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormFields state={state}>
        <div className="flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-gray-600 tabular-nums" aria-live="polite">
            {count("P")} presentes · {absent} {absent === 1 ? "falta" : "faltas"} · {excused}{" "}
            {excused === 1 ? "justificada" : "justificadas"}
          </p>
          <Button
            size="sm"
            color="alternative"
            disabled={absent + excused === 0}
            onClick={(e) => {
              setStatuses(Object.fromEntries(rows.map((r) => [r.id, "P"])));
              // A state change fires no input event: tell the unsaved-changes guard
              e.currentTarget.form?.dispatchEvent(new Event("input", { bubbles: true }));
            }}
          >
            Marcar todos presentes
          </Button>
        </div>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeadCell>Aluno</TableHeadCell>
                <TableHeadCell className="hidden sm:table-cell">Turma</TableHeadCell>
                <TableHeadCell className="text-right">Presença</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900">
                    {r.student}
                    <span className="block text-xs font-normal text-gray-600 sm:hidden">{r.className}</span>
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">{r.className}</TableCell>
                  <TableCell>
                    <div role="radiogroup" aria-label={`Presença de ${r.student}`} className="ml-auto flex w-fit">
                      {ATTENDANCE_STATUSES.map(([v, label], i) => (
                        <label key={v} title={label} className="relative">
                          <input
                            type="radio"
                            name={`status_${r.id}`}
                            value={v}
                            checked={statuses[r.id] === v}
                            onChange={() => setStatuses((all) => ({ ...all, [r.id]: v }))}
                            className="peer sr-only"
                          />
                          <span
                            className={`flex min-h-10 cursor-pointer items-center border px-2.5 text-sm sm:px-3 font-medium peer-focus-visible:z-10 peer-focus-visible:ring-2 peer-focus-visible:ring-primary-600 peer-focus-visible:ring-offset-1 ${statuses[r.id] === v ? STATUS_COLOR[v] : "border-gray-300 bg-white text-gray-700 hover:bg-gray-100"} ${i === 0 ? "rounded-l-lg" : "-ml-px"} ${i === ATTENDANCE_STATUSES.length - 1 ? "rounded-r-lg" : ""}`}
                          >
                            {STATUS_SHORT[v]}
                          </span>
                        </label>
                      ))}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      </FormFields>
      <FormButtons pending={pending} cancelHref={cancelHref} label="Salvar chamada" sticky />
    </form>
  );
}
