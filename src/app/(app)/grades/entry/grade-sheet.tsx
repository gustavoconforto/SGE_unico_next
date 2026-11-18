"use client";

import { Alert, Button, HelperText, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { useActionState } from "react";
import { formatGrade } from "@/lib/grades";
import { scoreInput, shownName } from "../score";
import { saveGradeSheet } from "./actions";

type Props = {
  selection: { query: string; classId: number; subjectId: number; period: number };
  recovery: boolean;
  examTypes: { id: number; code: string; name: string; kind: string; maxScore: string }[];
  rows: { id: number; name: string; average: string | null; result: string | null; saved: Record<number, string> }[];
  /** Exam type ids this user can't edit here (locked bimester or staff-only). */
  readOnly: number[];
  notice: string | null;
};

export function GradeSheet({ selection, recovery, examTypes, rows, readOnly, notice }: Props) {
  const [state, action, pending] = useActionState(saveGradeSheet.bind(null, selection), {});
  if (!examTypes.length) return <Alert color="warning">Cadastre um tipo de avaliação {recovery ? "de recuperação " : ""}para lançar notas.</Alert>;
  if (!rows.length) return <p className="text-gray-500">{recovery ? "Nenhum aluno desta turma está em recuperação nesta matéria." : "Nenhum aluno ativo nesta turma."}</p>;
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.formError && <Alert color="failure">{state.formError}</Alert>}
      {notice && <Alert color="warning">{notice}</Alert>}
      <p className="text-sm text-gray-500">Use vírgula nos decimais (ex.: 2,5) e apague o valor para remover uma nota.</p>
      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell>Aluno</TableHeadCell>
              {recovery && <TableHeadCell className="text-right whitespace-nowrap">Média anual</TableHeadCell>}
              {examTypes.map((t) => (
                <TableHeadCell key={t.id} className="text-right whitespace-nowrap" title={t.name}>
                  {t.code} <span className="block text-[10px] font-normal normal-case">até {formatGrade(t.maxScore)}</span>
                </TableHeadCell>
              ))}
              <TableHeadCell className="text-right whitespace-nowrap">{recovery ? "Média final" : "Nota do bimestre"}</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {rows.map((r) => (
              <TableRow key={r.id}>
                <TableCell className="font-medium text-gray-900 dark:text-white">{r.name}</TableCell>
                {recovery && <TableCell className="text-right">{formatGrade(r.average)}</TableCell>}
                {examTypes.map((t) => {
                  const name = `score_${r.id}_${t.id}`;
                  const error = state.errors?.[name]?.[0];
                  return (
                    <TableCell key={t.id} className="text-right">
                      <input type="hidden" name={shownName(name)} value={state.values?.[shownName(name)] ?? scoreInput(r.saved[t.id])} />
                      <TextInput
                        name={name}
                        inputMode="decimal"
                        aria-label={`${r.name} - ${t.code}`}
                        defaultValue={state.values?.[name] ?? scoreInput(r.saved[t.id])}
                        color={error ? "failure" : undefined}
                        readOnly={readOnly.includes(t.id)}
                        sizing="sm"
                        className="ml-auto w-20"
                      />
                      {error && <HelperText color="failure">{error}</HelperText>}
                    </TableCell>
                  );
                })}
                <TableCell className="text-right font-semibold">{formatGrade(r.result)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
      <div hidden={readOnly.length === examTypes.length}>
        <Button type="submit" disabled={pending}>
          Salvar notas
        </Button>
      </div>
    </form>
  );
}
