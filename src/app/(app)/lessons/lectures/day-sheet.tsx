"use client";

import { Alert, Badge, Button, HelperText, Select, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { useActionState } from "react";
import { saveLectureDay } from "./actions";

type Row = { period: number; label: string; subjectId: number | null; teacherId: number | null; topic: string; saved: boolean };

export function DaySheet({ classId, date, rows, subjects, teachers }: { classId: number; date: string; rows: Row[]; subjects: [number, string][]; teachers: [number, string][] }) {
  const [state, action, pending] = useActionState(saveLectureDay.bind(null, classId, date), {});
  const cell = (name: string, options: [number, string][], saved: number | null) => {
    const value = state.values?.[name] ?? (saved ? String(saved) : "");
    const error = state.errors?.[name]?.[0];
    return (
      <>
        <Select key={value} name={name} defaultValue={value} sizing="sm" color={error ? "failure" : undefined} aria-label={name}>
          <option value="">—</option>
          {options.map(([id, l]) => (
            <option key={id} value={id}>
              {l}
            </option>
          ))}
        </Select>
        {error && <HelperText color="failure">{error}</HelperText>}
      </>
    );
  };
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.formError && <Alert color="failure">{state.formError}</Alert>}
      <p className="text-sm text-gray-500">As aulas vêm da grade horária. Preencha o conteúdo para lançar a aula; apague o conteúdo para remover uma aula lançada.</p>
      <div className="overflow-x-auto">
        <Table>
          <TableHead>
            <TableRow>
              <TableHeadCell>Aula</TableHeadCell>
              <TableHeadCell>Matéria</TableHeadCell>
              <TableHeadCell>Professor</TableHeadCell>
              <TableHeadCell>Conteúdo</TableHeadCell>
              <TableHeadCell />
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => {
              const topicName = `topic_${r.period}`;
              const topicError = state.errors?.[topicName]?.[0] ?? state.errors?.[`date_${r.period}`]?.[0] ?? state.errors?.[`period_${r.period}`]?.[0];
              return (
                <TableRow key={r.period}>
                  <TableCell className="whitespace-nowrap">{r.label}</TableCell>
                  <TableCell className="min-w-40">{cell(`subject_${r.period}`, subjects, r.subjectId)}</TableCell>
                  <TableCell className="min-w-40">{cell(`teacher_${r.period}`, teachers, r.teacherId)}</TableCell>
                  <TableCell className="min-w-64">
                    <TextInput name={topicName} defaultValue={state.values?.[topicName] ?? r.topic} maxLength={200} sizing="sm" aria-label={`Conteúdo da ${r.label}`} />
                    {topicError && <HelperText color="failure">{topicError}</HelperText>}
                  </TableCell>
                  <TableCell>{r.saved && <Badge color="success">Lançada</Badge>}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
      <div>
        <Button type="submit" disabled={pending}>
          Salvar aulas
        </Button>
      </div>
    </form>
  );
}
