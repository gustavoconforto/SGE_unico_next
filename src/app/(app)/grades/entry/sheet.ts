// What a grade sheet shows: the class's active enrollments × the period's exam types (GradeSheetForm).
import { and, asc, eq, inArray, ne } from "drizzle-orm";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  gradesExamtype as examType,
  gradesGrade as grade,
  gradesGradelevelsubject as levelSubject,
  studentsStudent as student,
} from "@/db/schema/app";
import { BIMESTERS, ExamKind, FINAL_RECOVERY, type Score, bimesterGrade, finalAverage, finalGrade, needsRecovery, recoveryScore } from "@/lib/grades";

export async function loadSheet(classId: number, subjectId: number, period: number) {
  const [c] = await db.select({ gradeLevel: klass.gradeLevel }).from(klass).where(eq(klass.id, classId));
  if (!c?.gradeLevel) return null;
  const [offered] = await db.select({ id: levelSubject.id }).from(levelSubject).where(and(eq(levelSubject.gradeLevel, c.gradeLevel), eq(levelSubject.subjectId, subjectId)));
  if (!offered) return null;
  const recovery = period === FINAL_RECOVERY;
  const [enrollments, examTypes] = await Promise.all([
    db
      .select({ id: enrollment.id, name: student.name })
      .from(enrollment)
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .where(and(eq(enrollment.schoolClassId, classId), eq(enrollment.status, "A")))
      .orderBy(asc(student.name)),
    // Recovery exams are only taken in the final recovery, and only there
    db.select().from(examType).where(recovery ? eq(examType.kind, ExamKind.RECOVERY) : ne(examType.kind, ExamKind.RECOVERY)).orderBy(asc(examType.order), asc(examType.name)),
  ]);
  const ids = enrollments.map((e) => e.id);
  const grades = ids.length
    ? await db
        .select({ id: grade.id, enrollmentId: grade.enrollmentId, examTypeId: grade.examTypeId, bimester: grade.bimester, score: grade.score, kind: examType.kind })
        .from(grade)
        .innerJoin(examType, eq(grade.examTypeId, examType.id))
        .where(and(inArray(grade.enrollmentId, ids), eq(grade.subjectId, subjectId)))
    : [];
  const scoresOf = (enrollmentId: number, b: number): Score[] => grades.filter((g) => g.enrollmentId === enrollmentId && g.bimester === b);

  const all = enrollments
    .map((e) => {
      const average = recovery ? finalAverage(BIMESTERS.map((b) => bimesterGrade(scoresOf(e.id, b)))) : null;
      const saved = Object.fromEntries(grades.filter((g) => g.enrollmentId === e.id && g.bimester === period).map((g) => [g.examTypeId, g]));
      return {
        ...e,
        average,
        saved,
        // The bimester grade, or the final grade after recovery
        result: recovery ? finalGrade(average, recoveryScore(scoresOf(e.id, period))) : bimesterGrade(scoresOf(e.id, period)),
      };
    });
  // The final recovery lists only the students below the passing grade
  const rows = all.filter((r) => !recovery || needsRecovery(r.average));
  // Students whose annual average can't be computed yet (a bimester grade missing): they may still land in recovery
  const unaveraged = recovery ? all.filter((r) => r.average === null).length : 0;
  return { rows, examTypes, recovery, unaveraged };
}

export const cellName = (enrollmentId: number, examTypeId: number) => `score_${enrollmentId}_${examTypeId}`;
