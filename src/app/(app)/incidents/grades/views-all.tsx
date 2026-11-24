import { and, asc, count, eq, inArray, max, min } from "drizzle-orm";
import { Alert, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { EXTRA_CODE } from "@/lib/pathways";
import type { GradeKind } from "./actions";
import { ListPagination, SearchBox } from "@/components/list-controls";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  gradesExamtype as examType,
  gradesGrade as grade,
  studentsStudent as student,
} from "@/db/schema/app";
import { today } from "@/lib/finance";
import { formatGrade } from "@/lib/grades";
import { CONCEPT_CODE } from "@/lib/incidents";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { classCell } from "../records";
import { currentSchoolYear } from "@/lib/concept-db";
import { ConceptControls } from "./concept-controls";

/** Every active enrollment of the current school year, for the picked bimester. */
export async function GradesAll({ kind, sp }: { kind: GradeKind; sp: Record<string, string | string[] | undefined> }) {
  const code = kind === "extra" ? EXTRA_CODE : CONCEPT_CODE;
  const bimester = [1, 2, 3, 4].find((b) => b === Number(param(sp, "bimester"))) ?? null;
  const page = pageParam(sp);
  const [y, [concept]] = await Promise.all([
    currentSchoolYear(),
    db.select().from(examType).where(eq(examType.code, code)),
  ]);
  const where = y
    ? and(
        eq(enrollment.status, "A"),
        eq(enrollmentType.schoolYearId, y.id),
        searchWhere(param(sp, "q"), [student.name, student.socialName, klass.name]),
      )
    : undefined;
  const base = () =>
    db
      .select({ id: enrollment.id, name: student.name, className: klass.name, gradeLevel: klass.gradeLevel })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id));
  const [rows, [{ total }]] = y
    ? await Promise.all([
        base()
          .where(where)
          .orderBy(asc(student.name))
          .limit(PAGE_SIZE)
          .offset((page - 1) * PAGE_SIZE),
        db
          .select({ total: count() })
          .from(enrollment)
          .innerJoin(student, eq(enrollment.studentId, student.id))
          .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
          .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
          .where(where),
      ])
    : [[], [{ total: 0 }]];
  // Lowest and highest grade among the subjects: equal unless some subject was edited by hand
  const ranges =
    bimester && concept && rows.length
      ? await db
          .select({ id: grade.enrollmentId, low: min(grade.score), high: max(grade.score) })
          .from(grade)
          .where(
            and(
              inArray(
                grade.enrollmentId,
                rows.map((r) => r.id),
              ),
              eq(grade.examTypeId, concept.id),
              eq(grade.bimester, bimester),
            ),
          )
          .groupBy(grade.enrollmentId)
      : [];
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {kind === "extra" ? "Nota extra" : "Notas de conceito"} — todos os alunos
      </h1>
      {!y && <Alert color="warning">Cadastre o ano letivo de {today().slice(0, 4)} para calcular.</Alert>}
      {!concept && (
        <Alert color="warning">
          Cadastre o tipo de avaliação {kind === "extra" ? "Nota extra" : "Conceito"} (sigla {code}) para calcular.
        </Alert>
      )}
      <ConceptControls kind={kind} mode="all" bimester={bimester} />
      {!bimester ? (
        <p className="text-gray-500">Selecione um bimestre para ver e calcular as notas.</p>
      ) : (
        <>
          <SearchBox placeholder="Pesquisar por aluno ou turma..." />
          <Table striped>
            <TableHead>
              <TableRow>
                <TableHeadCell>Aluno</TableHeadCell>
                <TableHeadCell>Turma</TableHeadCell>
                <TableHeadCell className="text-right">{kind === "extra" ? "Nota extra" : "Conceito"}</TableHeadCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {rows.map((r) => {
                const range = ranges.find((x) => x.id === r.id);
                return (
                  <TableRow key={r.id}>
                    <TableCell>{r.name}</TableCell>
                    <TableCell>{classCell(r)}</TableCell>
                    <TableCell className="text-right">
                      {!range
                        ? "—"
                        : range.low === range.high
                          ? formatGrade(range.low)
                          : `${formatGrade(range.low)} a ${formatGrade(range.high)}`}
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          <ListPagination page={page} totalPages={Math.ceil(total / PAGE_SIZE)} />
        </>
      )}
    </div>
  );
}
