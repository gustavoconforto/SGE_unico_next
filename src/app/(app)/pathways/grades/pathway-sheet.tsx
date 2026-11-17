"use client";

import { Alert, Button, HelperText, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow, TextInput } from "flowbite-react";
import { useActionState } from "react";
import { formatDate } from "@/lib/finance";
import { formatGrade } from "@/lib/grades";
import { shownName } from "../../grades/score";
import { savePathwaySheet } from "./actions";

type Row = { id: number; student: string; leftAt: string | null; rate: string | null; score: string };

export function PathwaySheet({ selection, maxScore, hasDates, rows }: { selection: { query: string; offeringId: number; bimester: number }; maxScore: string; hasDates: boolean; rows: Row[] }) {
  const [state, action, pending] = useActionState(savePathwaySheet.bind(null, selection), {});
  return (
    <form action={action} className="flex flex-col gap-3">
      {state.formError && <Alert color="failure">{state.formError}</Alert>}
      <p className="text-sm text-gray-500">
        Notas de 0 a {formatGrade(maxScore)}, somadas como estão à nota extra do bimestre; use vírgula nos decimais (ex.: 0,5). Apague o valor para remover uma nota.
        {!hasDates && " O ano escolar não tem as datas deste bimestre: a frequência aparece quando elas forem preenchidas."}
      </p>
      <Table striped>
        <TableHead>
          <TableRow>
            <TableHeadCell>Aluno</TableHeadCell>
            <TableHeadCell className="text-right whitespace-nowrap">Frequência</TableHeadCell>
            <TableHeadCell className="text-right whitespace-nowrap">Nota</TableHeadCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {rows.length ? (
            rows.map((r) => {
              const name = `score_${r.id}`;
              const error = state.errors?.[name]?.[0];
              return (
                <TableRow key={r.id}>
                  <TableCell className="font-medium text-gray-900 dark:text-white">
                    {r.student}
                    {r.leftAt && <span className="ml-2 text-xs text-gray-500">Saiu em {formatDate(r.leftAt)}</span>}
                  </TableCell>
                  <TableCell className="text-right">{r.rate === null ? "-" : `${r.rate}%`}</TableCell>
                  <TableCell className="text-right">
                    <input type="hidden" name={shownName(name)} value={state.values?.[shownName(name)] ?? r.score} />
                    <TextInput key={state.values?.[name] ?? r.score} name={name} inputMode="decimal" sizing="sm" className="ml-auto w-24" defaultValue={state.values?.[name] ?? r.score} color={error ? "failure" : undefined} aria-label={`Nota de ${r.student}`} />
                    {error && <HelperText color="failure">{error}</HelperText>}
                  </TableCell>
                </TableRow>
              );
            })
          ) : (
            <TableRow>
              <TableCell colSpan={3} className="text-center text-gray-500">
                Nenhum aluno inscrito nesta turma de itinerário no bimestre
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>
      {rows.length > 0 && (
        <div>
          <Button type="submit" disabled={pending}>
            Salvar notas
          </Button>
        </div>
      )}
    </form>
  );
}
