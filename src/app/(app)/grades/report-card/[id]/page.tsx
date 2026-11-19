import { Badge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { formatGrade } from "@/lib/grades";
import { idParam } from "@/lib/list";
import { loadReportCard, situation } from "../../report";

export const metadata: Metadata = { title: "Boletim" };

export default async function ReportCardPage({ params }: PageProps<"/grades/report-card/[id]">) {
  const card = await loadReportCard(await idParam(params));
  if (!card) notFound();
  const e = card.enrollment;
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Boletim</h1>
        <LinkButton href={`/grades/report-card/${e.id}/print`} color="alternative">
          Imprimir
        </LinkButton>
      </div>
      <dl className="grid gap-2 text-sm sm:grid-cols-5">
        {[
          ["Ano letivo", e.schoolYear],
          ["Aluno", e.studentName],
          ["Matrícula", e.registration],
          ["Curso", e.program],
          ["Turma", e.className ? `${e.gradeLevel ? `${e.gradeLevel}º ` : ""}${e.className}` : "Sem turma"],
        ].map(([k, v]) => (
          <div key={k}>
            <dt className="text-gray-500">{k}</dt>
            <dd className="font-semibold">{v}</dd>
          </div>
        ))}
      </dl>
      <div className="overflow-x-auto">
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell className="px-3">Matéria</TableHeadCell>
              {[1, 2, 3, 4].map((b) => (
                <TableHeadCell key={b} className="px-3 text-right whitespace-nowrap">
                  {b}º bim.
                </TableHeadCell>
              ))}
              <TableHeadCell className="px-3 text-right">Média anual</TableHeadCell>
              <TableHeadCell className="px-3 text-right">Recuperação</TableHeadCell>
              <TableHeadCell className="px-3 text-right">Média final</TableHeadCell>
              <TableHeadCell className="px-3 text-right">Situação</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {card.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={9} className="text-center text-gray-500">
                  Nenhuma matéria cadastrada para a série desta turma.
                </TableCell>
              </TableRow>
            )}
            {card.rows.map((r) => {
              const sit = situation(r);
              return (
                <TableRow key={r.subject.id}>
                  <TableCell className="min-w-48 px-3 font-medium text-gray-900 dark:text-white">{r.subject.name}</TableCell>
                  {r.bimesters.map((g, i) => (
                    <TableCell key={i} className="px-3 text-right tabular-nums">
                      {formatGrade(g)}
                    </TableCell>
                  ))}
                  <TableCell className="px-3 text-right tabular-nums">{formatGrade(r.average)}</TableCell>
                  <TableCell className="px-3 text-right tabular-nums">{r.needsRecovery ? formatGrade(r.recovery) : "—"}</TableCell>
                  <TableCell className="px-3 text-right font-semibold tabular-nums">{formatGrade(r.final)}</TableCell>
                  <TableCell className="px-3 text-right">
                    <Badge color={sit.color} className="ml-auto w-fit whitespace-nowrap">
                      {sit.text}
                    </Badge>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
