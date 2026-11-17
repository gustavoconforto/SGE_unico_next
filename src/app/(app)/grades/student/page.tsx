import { Table, TableBody, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { loadReportCard, situation } from "../report";
import { GROUP, RESULT, STICKY } from "./cells";
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
          <div className="flex flex-wrap items-end justify-between gap-3">
            <dl className="flex flex-wrap gap-x-8 gap-y-2 text-sm">
              {(
                [
                  ["Aluno", active.enrollment.studentName],
                  ["Matrícula", active.enrollment.registration],
                  ["Curso", active.enrollment.program],
                  ["Turma", active.enrollment.className ?? "Sem turma"],
                ] as const
              ).map(([label, value]) => (
                <div key={label}>
                  <dt className="text-xs text-gray-500">{label}</dt>
                  <dd className="font-medium text-gray-900">{value}</dd>
                </div>
              ))}
            </dl>
            <LinkButton href={`/grades/report-card/${active.enrollment.id}/print`} color="alternative" size="sm">
              Imprimir boletim
            </LinkButton>
          </div>
          <p className="text-sm text-gray-500">Clique em Editar para alterar as notas de uma matéria. Use vírgula nos decimais (ex.: 2,5) e apague o valor para remover uma nota.</p>
          <div className="overflow-x-auto">
            <Table hoverable>
              <TableHead>
                <TableRow>
                  <TableHeadCell rowSpan={2} className={STICKY}>
                    Matéria
                  </TableHeadCell>
                  {[1, 2, 3, 4].map((b) => (
                    <TableHeadCell key={b} colSpan={active.examTypes.length + 1} className={`${GROUP} px-2 pb-1 text-center whitespace-nowrap`}>
                      {b}º bimestre
                    </TableHeadCell>
                  ))}
                  <TableHeadCell rowSpan={2} className={`${GROUP} px-3 text-right`}>
                    Média anual
                  </TableHeadCell>
                  <TableHeadCell rowSpan={2} className="px-3 text-right">
                    Recuperação
                  </TableHeadCell>
                  <TableHeadCell rowSpan={2} className={`${RESULT} px-3 text-right`}>
                    Média final
                  </TableHeadCell>
                  <TableHeadCell rowSpan={2} className="px-3">
                    Situação
                  </TableHeadCell>
                  <TableHeadCell rowSpan={2} className="px-3">
                    Ações
                  </TableHeadCell>
                </TableRow>
                <TableRow>
                  {[1, 2, 3, 4].flatMap((b) => [
                    ...active.examTypes.map((t, i) => (
                      <TableHeadCell key={`${b}-${t.id}`} className={`${i === 0 ? GROUP : ""} px-2 pt-0 text-right font-medium text-gray-500`} title={t.name}>
                        {t.code}
                      </TableHeadCell>
                    )),
                    <TableHeadCell key={`${b}-n`} className={`${RESULT} px-2 pt-0 text-right`}>
                      Nota
                    </TableHeadCell>,
                  ])}
                </TableRow>
              </TableHead>
              <TableBody className="divide-y divide-gray-100 tabular-nums">
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
