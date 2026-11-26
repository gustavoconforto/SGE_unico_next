// The three per-enrollment records (incident, delay, bathroom pass) share their list and form plumbing.
import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import { classesClass as klass, enrollmentsEnrollment as enrollment } from "@/db/schema/app";
import { INVALID_CHOICE, foreignKey, requiredDate } from "@/lib/form";
import { activeEnrollmentOptions, studentName } from "../enrollments/data";

export const recordFields = { enrollmentId: foreignKey, incidentDate: requiredDate };

export const studentColumns = { student: studentName, className: klass.name, gradeLevel: klass.gradeLevel };

export const classCell = (c: { className: string | null; gradeLevel: number | null }) =>
  c.className ? `${c.gradeLevel ? `${c.gradeLevel}º ` : ""}${c.className}` : "—";

export const INVALID_ENROLLMENT = { enrollmentId: [INVALID_CHOICE] };

/**
 * Why a batch form's checked enrollments can't be saved: none checked, or one no longer active (in `schoolClassId`,
 * when given); null when they can.
 */
export async function batchEnrollmentError(ids: number[], schoolClassId?: number): Promise<string | null> {
  if (!ids.length) return "Selecione ao menos um aluno.";
  const active = await db
    .select({ id: enrollment.id })
    .from(enrollment)
    .where(
      and(
        inArray(enrollment.id, ids),
        eq(enrollment.status, "A"),
        schoolClassId === undefined ? undefined : eq(enrollment.schoolClassId, schoolClassId),
      ),
    );
  return active.length === ids.length
    ? null
    : `Algum aluno selecionado não tem mais matrícula ativa${schoolClassId === undefined ? "" : " nesta turma"}. Recarregue a página.`;
}

/** Active enrollments A→Z by the name shown (social name when used), which activeEnrollmentOptions doesn't sort by. */
export const batchStudents = async () =>
  (await activeEnrollmentOptions()).sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"));
