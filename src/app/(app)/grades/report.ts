// report_card(): one row per subject of the enrollment's series, with each exam's score per bimester.
import { asc, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  gradesExamtype as examType,
  gradesGrade as grade,
  gradesGradelevelsubject as levelSubject,
  gradesSubject as subject,
  programsProgram as program,
  studentsStudent as student,
} from "@/db/schema/app";
import { BIMESTERS, ExamKind, FINAL_RECOVERY, type Score, reportRow } from "@/lib/grades";

export async function loadReportCard(enrollmentId: number) {
  const [e] = await db
    .select({
      id: enrollment.id,
      status: enrollment.status,
      studentName: student.name,
      registration: student.registration,
      program: program.name,
      schoolYear: year.begins,
      className: klass.name,
      gradeLevel: klass.gradeLevel,
    })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(program, eq(enrollmentType.programId, program.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
    .where(eq(enrollment.id, enrollmentId));
  if (!e) return null;
  const [subjects, grades, examTypes, recoveryTypes] = await Promise.all([
    // A class without a series has no subjects
    e.gradeLevel
      ? db.select({ id: subject.id, name: subject.name }).from(levelSubject).innerJoin(subject, eq(levelSubject.subjectId, subject.id)).where(eq(levelSubject.gradeLevel, e.gradeLevel)).orderBy(asc(subject.name))
      : [],
    db
      .select({ subjectId: grade.subjectId, bimester: grade.bimester, examTypeId: grade.examTypeId, score: grade.score, kind: examType.kind })
      .from(grade)
      .innerJoin(examType, eq(grade.examTypeId, examType.id))
      .where(eq(grade.enrollmentId, enrollmentId)),
    // Recovery isn't taken in the bimesters: it has its own column
    db.select().from(examType).where(ne(examType.kind, ExamKind.RECOVERY)).orderBy(asc(examType.order), asc(examType.name)),
    db.select().from(examType).where(eq(examType.kind, ExamKind.RECOVERY)).orderBy(asc(examType.order), asc(examType.name)),
  ]);
  const rows = subjects.map((s) => {
    const mine = grades.filter((g) => g.subjectId === s.id);
    const byPeriod = new Map<number, Score[]>();
    for (const g of mine) byPeriod.set(g.bimester, [...(byPeriod.get(g.bimester) ?? []), g]);
    const scoreOf = (b: number, t: number) => mine.find((g) => g.bimester === b && g.examTypeId === t)?.score ?? null;
    return {
      subject: s,
      ...reportRow(byPeriod),
      /** Per bimester, each (non-recovery) exam's score in column order. */
      examScores: BIMESTERS.map((b) => examTypes.map((t) => scoreOf(b, t.id))),
      recoveryScores: recoveryTypes.map((t) => scoreOf(FINAL_RECOVERY, t.id)),
    };
  });
  return { enrollment: { ...e, schoolYear: e.schoolYear.slice(0, 4) }, rows, examTypes, recoveryTypes };
}

export type ReportCard = NonNullable<Awaited<ReturnType<typeof loadReportCard>>>;

/** Situação: "Em andamento" until the year is complete, "Em recuperação" until the recovery score. */
export function situation(row: { average: unknown; needsRecovery: boolean; passed: boolean | null }) {
  if (row.average === null) return { text: "Em andamento", color: "gray" };
  if (row.passed === null) return { text: "Em recuperação", color: "warning" };
  return row.passed ? { text: "Aprovado", color: "success" } : { text: "Reprovado", color: "failure" };
}
