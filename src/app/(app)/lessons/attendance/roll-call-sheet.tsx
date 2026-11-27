"use client";

import { Button, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { useActionState, useState } from "react";
import { STATUS_COLOR, STATUS_SHORT } from "@/components/attendance-status";
import { FormButtons, FormFields } from "@/components/form-fields";
import { ATTENDANCE_NOTE_MAX, type AttendanceStatus, nextStatus } from "@/lib/attendance";
import { saveRollCall } from "./actions";

type Lesson = { period: number; label: string; subject: string };
type Student = { id: number; name: string; statuses: Record<number, AttendanceStatus>; note: string };

const key = (student: number, period: number) => `${student}_${period}`;

export function RollCallSheet({
  classId,
  date,
  lessons,
  students,
  cancelHref,
  enrollmentId = null,
}: {
  classId: number;
  date: string;
  enrollmentId?: number | null;
  lessons: Lesson[];
  students: Student[];
  cancelHref: string;
}) {
  const [state, action, pending] = useActionState(saveRollCall.bind(null, classId, date, enrollmentId), {});
  const [statuses, setStatuses] = useState<Record<string, AttendanceStatus>>(() =>
    Object.fromEntries(students.flatMap((s) => lessons.map((l) => [key(s.id, l.period), s.statuses[l.period] ?? "P"]))),
  );
  const change = (e: React.MouseEvent<HTMLButtonElement>, next: Record<string, AttendanceStatus>) => {
    setStatuses((all) => ({ ...all, ...next }));
    e.currentTarget.form?.dispatchEvent(new Event("input", { bubbles: true }));
  };
  const absent = Object.values(statuses).filter((s) => s !== "P").length;
  return (
    <form action={action} className="flex flex-col gap-3">
      <FormFields state={state}>
        <p className="text-sm text-gray-600 tabular-nums" aria-live="polite">
          Todos começam como presentes. Clique numa aula para alternar entre presente, falta e falta justificada ·{" "}
          {absent} {absent === 1 ? "falta marcada" : "faltas marcadas"}
        </p>
        <div className="overflow-x-auto">
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeadCell>Aluno</TableHeadCell>
                {lessons.map((l) => (
                  <TableHeadCell key={l.period} className="text-center">
                    {l.label}
                    <span className="block text-xs font-normal normal-case text-gray-600">{l.subject}</span>
                  </TableHeadCell>
                ))}
                <TableHeadCell>Observação</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {students.map((s) => {
                const allAbsent = lessons.every((l) => statuses[key(s.id, l.period)] === "F");
                return (
                  <TableRow key={s.id}>
                    <TableCell className="min-w-48 font-medium text-gray-900">
                      {s.name}
                      <Button
                        size="xs"
                        color="alternative"
                        className="mt-1"
                        disabled={allAbsent}
                        onClick={(e) =>
                          change(e, Object.fromEntries(lessons.map((l) => [key(s.id, l.period), "F" as const])))
                        }
                      >
                        Faltou o dia
                      </Button>
                    </TableCell>
                    {lessons.map((l) => {
                      const k = key(s.id, l.period);
                      const status = statuses[k];
                      return (
                        <TableCell key={l.period} className="text-center">
                          <input type="hidden" name={`status_${k}`} value={status} />
                          <button
                            type="button"
                            onClick={(e) => change(e, { [k]: nextStatus(status) })}
                            aria-label={`${s.name}, ${l.label} (${l.subject}): ${STATUS_SHORT[status]}`}
                            className={`min-h-10 min-w-24 rounded-lg border px-2 text-sm font-medium focus-visible:ring-2 focus-visible:ring-primary-600 focus-visible:ring-offset-1 focus-visible:outline-none ${STATUS_COLOR[status]}`}
                          >
                            {STATUS_SHORT[status]}
                          </button>
                        </TableCell>
                      );
                    })}
                    <TableCell className="min-w-64">
                      <TextInput
                        name={`note_${s.id}`}
                        defaultValue={state.values?.[`note_${s.id}`] ?? s.note}
                        maxLength={ATTENDANCE_NOTE_MAX}
                        sizing="sm"
                        aria-label={`Observação sobre ${s.name}`}
                      />
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      </FormFields>
      <FormButtons pending={pending} cancelHref={cancelHref} label="Salvar chamada" sticky />
    </form>
  );
}
