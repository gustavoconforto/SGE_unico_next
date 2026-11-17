import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { formatGrade } from "@/lib/grades";
import { idParam } from "@/lib/list";
import { loadReportCard, situation } from "../../../../../(app)/grades/report";
import { PrintToolbar } from "../../../../print-toolbar";

export const metadata: Metadata = { title: "Boletim escolar" };

const cell = "border border-gray-900 px-1 py-0.5 text-center";

export default async function ReportCardPrintPage({ params }: PageProps<"/grades/report-card/[id]/print">) {
  const card = await loadReportCard(await idParam(params));
  if (!card) notFound();
  const e = card.enrollment;
  const n = card.examTypes.length + 1;
  return (
    <>
      <PrintToolbar />
      <main className="mx-auto my-6 max-w-[297mm] bg-white p-[10mm] text-[9pt] shadow-lg print:m-0 print:max-w-none print:p-0 print:shadow-none">
        <style>{"@page { size: A4 landscape; margin: 10mm; }"}</style>
        <header className="mb-2 flex items-center justify-between border-b border-gray-900 pb-2">
          <div>
            <p className="text-[13pt] font-bold">ÚNICO EDUCACIONAL</p>
            <p>SGAS 606 BLOCO F PARTE A ASA SUL - Brasília - DF CEP:70200-660</p>
            <p>Telefone: (61)3244-0910</p>
          </div>
          {/* eslint-disable-next-line @next/next/no-img-element -- print page */}
          <img src="/img/Logo_light.png" alt="Único Educacional" className="h-14 w-auto" />
        </header>
        <h1 className="mb-2 text-center text-[14pt] font-bold uppercase">Boletim escolar</h1>
        <table className="mb-2 w-full border-collapse text-left">
          <tbody>
            <tr>
              <th className="border border-gray-900 px-1">ALUNO(A):</th>
              <td className="border border-gray-900 px-1">{e.studentName}</td>
              <th className="border border-gray-900 px-1">MATRÍCULA:</th>
              <td className="border border-gray-900 px-1">{e.registration}</td>
            </tr>
            <tr>
              <th className="border border-gray-900 px-1">CURSO:</th>
              <td className="border border-gray-900 px-1">{e.program}</td>
              <th className="border border-gray-900 px-1">TURMA:</th>
              <td className="border border-gray-900 px-1">
                {e.className ? `${e.gradeLevel ? `${e.gradeLevel}º ` : ""}${e.className}` : "Sem turma"} — ANO LETIVO: {e.schoolYear}
              </td>
            </tr>
          </tbody>
        </table>
        <table className="w-full border-collapse">
          <thead className="bg-gray-200">
            <tr>
              <th rowSpan={2} className={`${cell} text-left`}>
                Matéria
              </th>
              {[1, 2, 3, 4].map((b) => (
                <th key={b} colSpan={n} className={cell}>
                  {b}º bimestre
                </th>
              ))}
              <th rowSpan={2} className={cell}>
                Média anual
              </th>
              <th rowSpan={2} className={cell}>
                Recuperação
              </th>
              <th rowSpan={2} className={cell}>
                Média final
              </th>
              <th rowSpan={2} className={cell}>
                Situação
              </th>
            </tr>
            <tr>
              {[1, 2, 3, 4].flatMap((b) => [
                ...card.examTypes.map((t) => (
                  <th key={`${b}-${t.id}`} className={cell}>
                    {t.code}
                  </th>
                )),
                <th key={`${b}-n`} className={`${cell} font-bold`}>
                  Nota
                </th>,
              ])}
            </tr>
          </thead>
          <tbody>
            {card.rows.map((r) => (
              <tr key={r.subject.id}>
                <td className={`${cell} text-left`}>{r.subject.name}</td>
                {r.examScores.flatMap((scores, b) => [
                  ...scores.map((s, i) => (
                    <td key={`${b}-${i}`} className={cell}>
                      {s === null ? "" : formatGrade(s)}
                    </td>
                  )),
                  <td key={`${b}-n`} className={`${cell} font-bold`}>
                    {r.bimesters[b] === null ? "" : formatGrade(r.bimesters[b])}
                  </td>,
                ])}
                <td className={cell}>{r.average === null ? "" : formatGrade(r.average)}</td>
                <td className={cell}>{r.needsRecovery && r.recovery !== null ? formatGrade(r.recovery) : ""}</td>
                <td className={`${cell} font-bold`}>{r.final === null ? "" : formatGrade(r.final)}</td>
                <td className={cell}>{situation(r).text}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </main>
    </>
  );
}
