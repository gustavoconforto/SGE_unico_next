"use client";

import { Alert, Badge, Button, TableCell, TableRow, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { formatGrade } from "@/lib/grades";
import { scoreInput, shownName } from "../score";
import { type RowState, saveSubjectGrades } from "./actions";

type Row = {
  subject: { id: number; name: string };
  bimesters: (string | null)[];
  examScores: (string | null)[][];
  recoveryScores: (string | null)[];
  average: string | null;
  recovery: string | null;
  final: string | null;
  needsRecovery: boolean;
  situation: { text: string; color: string };
};
type Exam = { id: number; code: string };

/** One subject's row: read-only, or score inputs after "Editar" (Django's htmx row swap). */
export function SubjectRow({ enrollmentId, row, examTypes, recoveryTypes }: { enrollmentId: number; row: Row; examTypes: Exam[]; recoveryTypes: Exam[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<RowState>({});
  const [pending, start] = useTransition();
  const action = (formData: FormData) =>
    start(async () => {
      const result = await saveSubjectGrades(enrollmentId, row.subject.id, state, formData);
      setState(result);
      if (result.saved) {
        setEditing(false);
        router.refresh();
      }
    });

  const input = (bimester: number, t: Exam, saved: string | null) => {
    const name = `score_${bimester}_${t.id}`;
    const error = state.errors?.[name]?.[0];
    return (
      <TableCell key={name} className="px-1">
        <input type="hidden" name={shownName(name)} form={`row-${row.subject.id}`} value={state.values?.[shownName(name)] ?? scoreInput(saved)} />
        <TextInput name={name} form={`row-${row.subject.id}`} aria-label={`${row.subject.name} ${bimester === 5 ? "recuperação" : `${bimester}º bim.`} ${t.code}`} title={error} defaultValue={state.values?.[name] ?? scoreInput(saved)} sizing="sm" inputMode="decimal" color={error ? "failure" : undefined} className="w-16" />
      </TableCell>
    );
  };

  if (!editing)
    return (
      <TableRow>
        <TableCell className="font-medium whitespace-nowrap text-gray-900 dark:text-white">{row.subject.name}</TableCell>
        {row.examScores.flatMap((scores, b) => [
          ...scores.map((s, i) => (
            <TableCell key={`${b}-${i}`} className="px-1 text-right text-gray-500">
              {s === null ? "" : formatGrade(s)}
            </TableCell>
          )),
          <TableCell key={`${b}-n`} className="border-r px-1 text-right font-semibold dark:border-gray-700">
            {formatGrade(row.bimesters[b])}
          </TableCell>,
        ])}
        <TableCell className="text-right">{formatGrade(row.average)}</TableCell>
        <TableCell className="text-right">{row.needsRecovery ? formatGrade(row.recovery) : "—"}</TableCell>
        <TableCell className="text-right font-semibold">{formatGrade(row.final)}</TableCell>
        <TableCell>
          <Badge color={row.situation.color} className="w-fit">
            {row.situation.text}
          </Badge>
        </TableCell>
        <TableCell>
          <Button size="xs" color="alternative" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </TableCell>
      </TableRow>
    );

  return (
    <TableRow className="bg-blue-50 dark:bg-gray-700">
      <TableCell className="font-medium whitespace-nowrap">
        {row.subject.name}
        <form id={`row-${row.subject.id}`} action={action} />
        {state.formError && (
          <Alert color="failure" className="mt-1 p-2 text-xs">
            {state.formError}
          </Alert>
        )}
      </TableCell>
      {row.examScores.flatMap((scores, b) => [
        ...examTypes.map((t, i) => input(b + 1, t, scores[i])),
        <TableCell key={`${b}-n`} className="border-r px-1 text-right dark:border-gray-700">
          {formatGrade(row.bimesters[b])}
        </TableCell>,
      ])}
      <TableCell className="text-right">{formatGrade(row.average)}</TableCell>
      <TableCell>
        <div className="flex gap-1">{recoveryTypes.map((t, i) => input(5, t, row.recoveryScores[i]))}</div>
      </TableCell>
      <TableCell className="text-right">{formatGrade(row.final)}</TableCell>
      <TableCell />
      <TableCell>
<div className="flex gap-1 whitespace-nowrap">
        <Button size="xs" type="submit" form={`row-${row.subject.id}`} disabled={pending}>
          Salvar
        </Button>
        <Button size="xs" color="alternative" onClick={() => setEditing(false)}>
          Cancelar
        </Button>
      </div>
</TableCell>
    </TableRow>
  );
}
