import { and, eq } from "drizzle-orm";
import { Alert, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { EXTRA_CODE } from "@/lib/pathways";
import type { GradeKind } from "./actions";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import { gradesExamtype as examType, gradesGrade as grade } from "@/db/schema/app";
import { formatGrade } from "@/lib/grades";
import { CONCEPT_CODE } from "@/lib/incidents";
import { param } from "@/lib/list";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { loadReportCard } from "../../grades/report";
import { ConceptControls } from "./concept-controls";

/** One student: the grade of each subject for the picked bimester, and "Calcular". */
export async function GradesIndividual({ kind, sp }: { kind: GradeKind; sp: Record<string, string | string[] | undefined> }) {
  const code = kind === "extra" ? EXTRA_CODE : CONCEPT_CODE;
  const enrollmentId = Number(param(sp, "enrollment")) || null;
  const bimester = [1, 2, 3, 4].find((b) => b === Number(param(sp, "bimester"))) ?? null;
  const [enrollments, [concept]] = await Promise.all([activeEnrollmentOptions(), db.select().from(examType).where(eq(examType.code, code))]);
  const active = enrollmentId && enrollments.some(([id]) => id === enrollmentId) ? enrollmentId : null;
  const card = active && bimester ? await loadReportCard(active) : null;
  const scores =
    card && concept
      ? await db
          .select({ subjectId: grade.subjectId, score: grade.score })
          .from(grade)
          .where(and(eq(grade.enrollmentId, active!), eq(grade.examTypeId, concept.id), eq(grade.bimester, bimester!)))
      : [];
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">{kind === "extra" ? "Nota extra" : "Notas de conceito"}</h1>
        <LinkButton href={kind === "extra" ? "/pathways/extra-grades/all" : "/incidents/grades/all"} color="alternative">
          Todos os alunos
        </LinkButton>
      </div>
      <p className="text-sm text-gray-500">
        {kind === "extra"
          ? "A nota extra soma as notas dadas pelos professores dos itinerários no bimestre, até a nota máxima da avaliação EX. A mesma nota vai para todas as matérias da série."
          : "O conceito começa em 1 e perde as penalidades das ocorrências do bimestre e 0,2 por atraso tolerado além do segundo. A mesma nota vai para todas as matérias da série."}
      </p>
      {!concept && (
        <Alert color="warning">
          Cadastre o tipo de avaliação {kind === "extra" ? "Nota extra" : "Conceito"} (sigla {code}) para calcular.
        </Alert>
      )}
      <ConceptControls kind={kind} mode="individual" enrollments={enrollments} enrollmentId={active} bimester={bimester} />
      {card && (
        <Table striped>
          <TableHead>
            <TableRow>
              <TableHeadCell>Matéria</TableHeadCell>
              <TableHeadCell className="text-right">{kind === "extra" ? "Nota extra" : "Conceito"}</TableHeadCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {card.rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={2} className="text-center text-gray-500">
                  Cadastre as matérias por série para lançar a nota.
                </TableCell>
              </TableRow>
            )}
            {card.rows.map((r) => {
              const s = scores.find((x) => x.subjectId === r.subject.id);
              return (
                <TableRow key={r.subject.id}>
                  <TableCell>{r.subject.name}</TableCell>
                  <TableCell className="text-right">{s ? formatGrade(s.score) : "—"}</TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      )}
    </div>
  );
}
