"use client";

import Decimal from "decimal.js";
import { Alert, Badge, Button, TableCell, TableRow, TextInput } from "flowbite-react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { PASSING_GRADE, formatGrade } from "@/lib/grades";
import { scoreInput, shownName } from "../score";
import { type RowState, saveSubjectGrades } from "./actions";
import { GROUP, RESULT, SCORE, STICKY, STICKY_BODY } from "./cells";

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

/** Text color for a computed grade: muted when missing, red below passing. */
const tone = (g: string | null) => (g === null ? "text-gray-400" : new Decimal(g).lt(PASSING_GRADE) ? "text-red-600" : "text-gray-900");

/** One subject's row: read-only, or score inputs after "Editar" (Django's htmx row swap). */
export function SubjectRow({ enrollmentId, row, examTypes, recoveryTypes }: { enrollmentId: number; row: Row; examTypes: Exam[]; recoveryTypes: Exam[] }) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [state, setState] = useState<RowState>({});
  const [pending, start] = useTransition();
  const formId = `row-${row.subject.id}`;
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
      <span key={name}>
        <input type="hidden" name={shownName(name)} form={formId} value={state.values?.[shownName(name)] ?? scoreInput(saved)} />
        <TextInput name={name} form={formId} aria-label={`${row.subject.name} ${bimester === 5 ? "recuperação" : `${bimester}º bim.`} ${t.code}`} title={error} defaultValue={state.values?.[name] ?? scoreInput(saved)} sizing="sm" inputMode="decimal" color={error ? "failure" : undefined} className="w-10 [&_input]:px-0.5 [&_input]:text-right" />
      </span>
    );
  };

  // The bimester grade, annual average and final average are computed, so they read the same in both modes.
  const results = (b: number) => (
    <TableCell key={`${b}-n`} className={`${RESULT} px-2 text-right font-semibold ${tone(row.bimesters[b])}`}>
      {formatGrade(row.bimesters[b])}
    </TableCell>
  );
  const average = <TableCell className={`${GROUP} px-3 text-right ${tone(row.average)}`}>{formatGrade(row.average)}</TableCell>;
  const final = <TableCell className={`${RESULT} px-3 text-right font-semibold ${tone(row.final)}`}>{formatGrade(row.final)}</TableCell>;

  if (!editing)
    return (
      <TableRow className="[&>td]:py-2.5">
        <TableCell className={`${STICKY_BODY} font-medium whitespace-nowrap text-gray-900`}>{row.subject.name}</TableCell>
        {row.examScores.flatMap((scores, b) => [
          ...scores.map((s, i) => (
            <TableCell key={`${b}-${i}`} className={`${i === 0 ? GROUP : ""} ${SCORE} px-2 text-right text-gray-500`}>
              {s === null ? "" : formatGrade(s)}
            </TableCell>
          )),
          results(b),
        ])}
        {average}
        <TableCell className={`px-3 text-right ${row.needsRecovery ? tone(row.recovery) : "text-gray-400"}`}>{row.needsRecovery ? formatGrade(row.recovery) : "—"}</TableCell>
        {final}
        <TableCell className="px-3">
          <Badge color={row.situation.color} className="w-fit whitespace-nowrap">
            {row.situation.text}
          </Badge>
        </TableCell>
        <TableCell className="px-3">
          <Button size="xs" color="alternative" onClick={() => setEditing(true)}>
            Editar
          </Button>
        </TableCell>
      </TableRow>
    );

  return (
    <TableRow className="bg-blue-50 hover:bg-blue-50 [&>td]:py-2">
      <TableCell className={`${STICKY} bg-blue-50 font-medium whitespace-nowrap text-gray-900`}>
        {row.subject.name}
        <form id={formId} action={action} />
        {state.formError && (
          <Alert color="failure" className="mt-1 p-2 text-xs whitespace-normal">
            {state.formError}
          </Alert>
        )}
      </TableCell>
      {row.examScores.flatMap((scores, b) => [
        ...examTypes.map((t, i) => (
          <TableCell key={`${b}-${t.id}`} className={`${i === 0 ? GROUP : ""} px-0.5`}>
            {input(b + 1, t, scores[i])}
          </TableCell>
        )),
        results(b),
      ])}
      {average}
      <TableCell className="px-3">
        <div className="flex justify-end gap-1">{recoveryTypes.map((t, i) => input(5, t, row.recoveryScores[i]))}</div>
      </TableCell>
      {final}
      {/* Situação is blank while editing, so the buttons span it instead of widening Ações */}
      <TableCell colSpan={2} className="px-3">
        <div className="flex justify-end gap-1 whitespace-nowrap">
          <Button size="xs" type="submit" form={formId} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
          <Button size="xs" color="alternative" onClick={() => setEditing(false)} disabled={pending}>
            Cancelar
          </Button>
        </div>
      </TableCell>
    </TableRow>
  );
}
