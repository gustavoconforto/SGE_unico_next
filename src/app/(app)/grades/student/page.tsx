import { Table, TableBody, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { loadReportCard, situation } from "../report";
import { EnrollmentPicker } from "./enrollment-picker";
import { SubjectRow } from "./student-grades";

export const metadata: Metadata = { title: "Notas do aluno" };

export default async function StudentGradesPage({ searchParams }: PageProps<"/grades/student">) {
  const id = Number(param(await searchParams, "enrollment")) || null;
  const [options, card] = await Promise.all([activeEnrollmentOptions(), id ? loadReportCard(id) : null]);
  const active = card && card.enrollment.status === "A" ? card : null;
  const fix = (v: { toFixed(n: number): string } | null) => v?.toFixed(2) ?? null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Notas do aluno</h1>
      <EnrollmentPicker options={options} value={active ? id : null} />
      {!active ? (
        <p className="text-gray-500">Selecione o aluno.</p>
      ) : (
        <>
          <p className="text-sm">
            Aluno: <strong>{active.enrollment.studentName}</strong> · Matrícula: <strong>{active.enrollment.registration}</strong> · Curso: <strong>{active.enrollment.program}</strong> · Turma:{" "}
            <strong>{active.enrollment.className ?? "Sem turma"}</strong>
          </p>
          <p className="text-sm text-gray-500">Clique em Editar para alterar as notas de uma matéria. Use vírgula nos decimais (ex.: 2,5) e apague o valor para remover uma nota.</p>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell rowSpan={2}>Matéria</TableHeadCell>
                  {[1, 2, 3, 4].map((b) => (
                    <TableHeadCell key={b} colSpan={active.examTypes.length + 1} className="text-center">
                      {b}º bimestre
                    </TableHeadCell>
                  ))}
                  <TableHeadCell rowSpan={2} className="text-right whitespace-nowrap">Média anual</TableHeadCell>
                  <TableHeadCell rowSpan={2} className="text-right">Recuperação</TableHeadCell>
                  <TableHeadCell rowSpan={2} className="text-right whitespace-nowrap">Média final</TableHeadCell>
                  <TableHeadCell rowSpan={2}>Situação</TableHeadCell>
                  <TableHeadCell rowSpan={2}>Ações</TableHeadCell>
                </TableRow>
                <TableRow>
                  {[1, 2, 3, 4].flatMap((b) => [
                    ...active.examTypes.map((t) => (
                      <TableHeadCell key={`${b}-${t.id}`} className="px-1 text-right" title={t.name}>
                        {t.code}
                      </TableHeadCell>
                    )),
                    <TableHeadCell key={`${b}-n`} className="px-1 text-right">
                      Nota
                    </TableHeadCell>,
                  ])}
                </TableRow>
              </TableHead>
              <TableBody>
                {active.rows.map((r) => (
                  <SubjectRow
                    key={r.subject.id}
                    enrollmentId={active.enrollment.id}
                    examTypes={active.examTypes}
                    recoveryTypes={active.recoveryTypes}
                    row={{
                      subject: r.subject,
                      bimesters: r.bimesters.map(fix),
                      examScores: r.examScores,
                      recoveryScores: r.recoveryScores,
                      average: fix(r.average),
                      recovery: fix(r.recovery),
                      final: fix(r.final),
                      needsRecovery: r.needsRecovery,
                      situation: situation(r),
                    }}
                  />
                ))}
              </TableBody>
            </Table>
          </div>
        </>
      )}
    </div>
  );
}
