// Concept grades from incidents and delays (incidents/services.py) and the series-wide save
// (grades/services.py save_series_grades): every subject of the enrollment's series gets the same score.
import { and, between, count, eq, inArray, sql, sum } from "drizzle-orm";
import { connection } from "next/server";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  gradesGrade as grade,
  gradesGradelevelsubject as levelSubject,
  incidentsIncident as incident,
  incidentsIncidenttype as incidentType,
  incidentsStudentdelay as delay,
} from "@/db/schema/app";
import { today } from "./finance";
import { conceptGrade } from "./incidents";

type SchoolYear = typeof year.$inferSelect;

/** (begins, ends) of the bimester, or null when the school year lacks its dates. */
export function bimesterRange(y: SchoolYear, bimester: number): [string, string] | null {
  const begins = y[`bi${bimester}Begins` as keyof SchoolYear] as string | null;
  const ends = y[`bi${bimester}Ends` as keyof SchoolYear] as string | null;
  return begins && ends ? [begins, ends] : null;
}

/** {enrollment id: concept grade}; enrollments whose year has no dates for the bimester are left out. */
export async function conceptGrades(enrollmentIds: number[], bimester: number) {
  if (!enrollmentIds.length) return new Map<number, string>();
  const rows = await db
    .select({ id: enrollment.id, y: year })
    .from(enrollment)
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .where(inArray(enrollment.id, enrollmentIds));
  // One grouped query per kind (not two per student), each row dated inside its own year's bimester
  const begins = year[`bi${bimester}Begins` as keyof typeof year] as typeof year.bi1Begins;
  const ends = year[`bi${bimester}Ends` as keyof typeof year] as typeof year.bi1Ends;
  const [penalties, delays] = await Promise.all([
    db
      .select({ id: incident.enrollmentId, total: sum(incidentType.penalty) })
      .from(incident)
      .innerJoin(incidentType, eq(incident.incidentTypeId, incidentType.id))
      .innerJoin(enrollment, eq(incident.enrollmentId, enrollment.id))
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(and(inArray(incident.enrollmentId, enrollmentIds), between(incident.incidentDate, begins, ends)))
      .groupBy(incident.enrollmentId),
    db
      .select({ id: delay.enrollmentId, total: count() })
      .from(delay)
      .innerJoin(enrollment, eq(delay.enrollmentId, enrollment.id))
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(and(inArray(delay.enrollmentId, enrollmentIds), eq(delay.delayType, "A"), between(delay.incidentDate, begins, ends)))
      .groupBy(delay.enrollmentId),
  ]);
  const penaltyOf = new Map(penalties.map((x) => [x.id, x.total]));
  const delaysOf = new Map(delays.map((x) => [x.id, x.total]));
  const grades = new Map<number, string>();
  for (const r of rows) {
    if (!bimesterRange(r.y, bimester)) continue;
    grades.set(r.id, conceptGrade(penaltyOf.get(r.id) ?? "0", delaysOf.get(r.id) ?? 0).toFixed(2));
  }
  return grades;
}

/** Gives every subject of each enrollment's series its score; returns the ids skipped (no score or no subjects). */
export async function saveSeriesGrades(enrollmentIds: number[], bimester: number, examTypeId: number, scores: Map<number, string>) {
  const [enrollments, subjects] = await Promise.all([
    enrollmentIds.length
      ? db.select({ id: enrollment.id, gradeLevel: klass.gradeLevel }).from(enrollment).leftJoin(klass, eq(enrollment.schoolClassId, klass.id)).where(inArray(enrollment.id, enrollmentIds))
      : [],
    db.select({ gradeLevel: levelSubject.gradeLevel, subjectId: levelSubject.subjectId }).from(levelSubject),
  ]);
  const skipped: number[] = [];
  const rows: (typeof grade.$inferInsert)[] = [];
  for (const e of enrollments) {
    const subjectIds = subjects.filter((s) => s.gradeLevel === e.gradeLevel).map((s) => s.subjectId);
    const score = scores.get(e.id);
    if (score === undefined || !e.gradeLevel || !subjectIds.length) {
      skipped.push(e.id);
      continue;
    }
    rows.push(...subjectIds.map((subjectId) => ({ enrollmentId: e.id, subjectId, examTypeId, bimester, score })));
  }
  if (rows.length)
    await db.transaction(async (tx) => {
      for (let i = 0; i < rows.length; i += 500)
        await tx
          .insert(grade)
          .values(rows.slice(i, i + 500))
          .onConflictDoUpdate({ target: [grade.enrollmentId, grade.subjectId, grade.examTypeId, grade.bimester], set: { score: sqlExcluded("score"), updatedAt: new Date().toISOString() } });
    });
  return skipped;
}

const sqlExcluded = (column: string) => sql.raw(`excluded.${column}`);

/** The school year that begins in today's calendar year (incidents/forms.py current_school_year). */
export async function currentSchoolYear() {
  await connection(); // depends on today's date: never prerender it
  const [y] = await db.select().from(year).where(sql`extract(year from ${year.begins}) = ${Number(today().slice(0, 4))}`).orderBy(year.begins).limit(1);
  return y ?? null;
}
