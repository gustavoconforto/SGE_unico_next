// Labels and options shared by the enrollment pages (Django __str__ of Enrollment, EnrollmentType, Class).
import { and, asc, desc, eq, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsDiscounttype as discountType,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  programsProgram as program,
  studentsStudent as student,
} from "@/db/schema/app";
import { LEVELS, label } from "@/lib/finance";
import { ref } from "@/lib/sql";
import type { ClassOption, EnrollmentTypeOption } from "./data-client";

export { classesFor, type ClassOption, type EnrollmentTypeOption } from "./data-client";

export const yearOf = sql<number>`extract(year from ${year.begins})::int`;

/** Student.__str__: the social name when the student uses it. */
export const studentName = sql<string>`case when ${student.useSocialName} and ${student.socialName} <> '' then ${student.socialName} else ${student.name} end`;

/** EnrollmentType.__str__: "Pré ENEM - 1ª Série - 2027". */
export const enrollmentTypeLabel = (programName: string, level: string, schoolYear: number) =>
  `${programName} - ${label(LEVELS, level)} - ${schoolYear}`;

/** Class.__str__: "2º Inspiração - 2027". */
export const classLabel = (c: { gradeLevel: number | null; name: string; year: number }) =>
  `${c.gradeLevel ? `${c.gradeLevel}º ` : ""}${c.name} - ${c.year}`;

export async function enrollmentTypeOptions(): Promise<EnrollmentTypeOption[]> {
  const rows = await db
    .select({
      id: enrollmentType.id,
      level: enrollmentType.level,
      totalPrice: enrollmentType.totalPrice,
      schoolYearId: enrollmentType.schoolYearId,
      programId: enrollmentType.programId,
      program: program.name,
      schoolYear: yearOf,
    })
    .from(enrollmentType)
    .innerJoin(program, eq(enrollmentType.programId, program.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .orderBy(desc(year.begins), asc(program.name), asc(enrollmentType.level));
  return rows.map((r) => ({ ...r, label: enrollmentTypeLabel(r.program, r.level, r.schoolYear) }));
}

/** Every class, labelled "2º Inspiração - 2027 (12/50)" (active students / capacity); the form filters by contract. */
export async function classOptions(): Promise<ClassOption[]> {
  const rows = await db
    .select({
      id: klass.id,
      name: klass.name,
      gradeLevel: klass.gradeLevel,
      capacity: klass.capacity,
      schoolYearId: klass.yearId,
      programId: klass.programId,
      year: yearOf,
      active: sql<number>`(select count(*) from enrollments_enrollment e where e.school_class_id = ${ref(klass.id)} and e.status = 'A')::int`,
    })
    .from(klass)
    .innerJoin(year, eq(klass.yearId, year.id))
    .orderBy(desc(year.begins), asc(klass.gradeLevel), asc(klass.name));
  return rows.map((c) => ({ ...c, label: `${classLabel(c)} (${c.active}/${c.capacity ?? "—"})` }));
}

// shortcut: every student in one <select> (fine for a school's ~1.5k); switch to a search box past that
export async function studentOptions(): Promise<[number, string][]> {
  const rows = await db
    .select({ id: student.id, name: studentName, registration: student.registration })
    .from(student)
    .orderBy(asc(student.name));
  return rows.map((s) => [s.id, `${s.name} (${s.registration})`]);
}

export async function discountTypeOptions() {
  return db
    .select({ id: discountType.id, description: discountType.description, percentage: discountType.percentage })
    .from(discountType)
    .orderBy(asc(discountType.description));
}

/** One enrollment with what its pages need. */
export async function getEnrollment(id: number) {
  const [row] = await db
    .select({
      e: enrollment,
      studentName,
      studentSelfFinancial: student.isSelfFinancial,
      program: program.name,
      level: enrollmentType.level,
      schoolYear: yearOf,
      schoolYearId: enrollmentType.schoolYearId,
      programId: enrollmentType.programId,
    })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(program, eq(enrollmentType.programId, program.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .where(and(eq(enrollment.id, id)));
  return row;
}

/** Active enrollments as "Aluno - Ensino Médio - 1ª Série - 2026", plus `keep` (the one being edited). */
export async function activeEnrollmentOptions(
  keep?: number | null,
  schoolYearId?: number | null,
): Promise<[number, string][]> {
  const rows = await db
    .select({ id: enrollment.id, name: studentName, program: program.name, level: enrollmentType.level, year: yearOf })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(program, eq(enrollmentType.programId, program.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .where(
      or(
        and(
          eq(enrollment.status, "A"),
          schoolYearId === undefined
            ? undefined
            : schoolYearId === null
              ? sql`false`
              : eq(enrollmentType.schoolYearId, schoolYearId),
        ),
        keep ? eq(enrollment.id, keep) : undefined,
      ),
    )
    .orderBy(asc(student.name));
  return rows.map((r) => [r.id, `${r.name} - ${enrollmentTypeLabel(r.program, r.level, r.year)}`]);
}

/** Whether `id` may be picked: an active enrollment, or the one the record already has. */
export async function enrollmentAllowed(id: number, current?: number | null, schoolYearId?: number | null) {
  if (id === current) return true;
  const [row] = await db
    .select({ status: enrollment.status, schoolYearId: enrollmentType.schoolYearId })
    .from(enrollment)
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .where(eq(enrollment.id, id));
  return row?.status === "A" && (schoolYearId === undefined || row.schoolYearId === schoolYearId);
}
