"use server";

import { and, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  gradesExamtype as examType,
  studentsStudent as student,
} from "@/db/schema/app";
import { bimesterRange, conceptGrades, currentSchoolYear, saveSeriesGrades } from "@/lib/concept-db";
import { today } from "@/lib/finance";
import { STAFF_ONLY } from "@/lib/grade-lock";
import { CONCEPT_CODE } from "@/lib/incidents";
import { EXTRA_CODE } from "@/lib/pathways";
import { extraGrades } from "@/lib/pathways-db";
import { hasPermission } from "@/lib/authorization";

export type ConceptResult = { ok?: string; error?: string; warning?: string };

/** Concept grade (incidents) or extra grade (pathways): same screens, different exam type and rule. */
export type GradeKind = "concept" | "extra";
const KIND = {
  concept: {
    code: CONCEPT_CODE,
    missing: `Cadastre o tipo de avaliação Conceito (sigla ${CONCEPT_CODE}) para calcular.`,
  },
  extra: { code: EXTRA_CODE, missing: `Cadastre o tipo de avaliação Nota extra (sigla ${EXTRA_CODE}) para calcular.` },
};

async function kindExamType(kind: GradeKind) {
  const [t] = await db
    .select({ id: examType.id, maxScore: examType.maxScore })
    .from(examType)
    .where(eq(examType.code, KIND[kind].code));
  return t;
}

/** The grades a kind computes for the bimester. */
const computeGrades = (kind: GradeKind, ids: number[], bimester: number, maxScore: string) =>
  kind === "extra" ? extraGrades(ids, bimester, maxScore) : conceptGrades(ids, bimester);

export async function computeIndividual(
  kind: GradeKind,
  enrollmentId: number,
  bimester: number,
): Promise<ConceptResult> {
  if (!(await hasPermission("grades", "manage"))) return { error: STAFF_ONLY };
  const t = await kindExamType(kind);
  if (!t) return { error: KIND[kind].missing };
  const [e] = await db.select({ status: enrollment.status }).from(enrollment).where(eq(enrollment.id, enrollmentId));
  if (e?.status !== "A" || ![1, 2, 3, 4].includes(bimester)) return { error: "Selecione um aluno e um bimestre." };
  const skipped = await saveSeriesGrades(
    [enrollmentId],
    bimester,
    t.id,
    await computeGrades(kind, [enrollmentId], bimester, t.maxScore),
  );
  return skipped.length
    ? {
        error:
          "Não foi possível calcular: verifique as datas do bimestre no ano letivo e as matérias da série do aluno.",
      }
    : { ok: "Registro atualizado com sucesso" };
}

export async function computeAll(kind: GradeKind, bimester: number): Promise<ConceptResult> {
  if (!(await hasPermission("grades", "manage"))) return { error: STAFF_ONLY };
  if (![1, 2, 3, 4].includes(bimester)) return { error: "Selecione um bimestre." };
  const t = await kindExamType(kind);
  if (!t) return { error: KIND[kind].missing };
  const y = await currentSchoolYear();
  if (!y) return { error: `Cadastre o ano letivo de ${today().slice(0, 4)} para calcular.` };
  const ids = (
    await db
      .select({ id: enrollment.id })
      .from(enrollment)
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .where(and(eq(enrollment.status, "A"), eq(enrollmentType.schoolYearId, y.id)))
  ).map((r) => r.id);
  const skipped = await saveSeriesGrades(ids, bimester, t.id, await computeGrades(kind, ids, bimester, t.maxScore));
  if (!skipped.length) return { ok: "Registro atualizado com sucesso" };
  // Why the series-wide save skipped them: the year lacks the bimester dates, or each student lacks subjects
  if (!bimesterRange(y, bimester))
    return {
      ok: "Registro atualizado com sucesso",
      warning: `Nenhuma nota calculada: o ano letivo ${y.begins.slice(0, 4)} não tem as datas do ${bimester}º bimestre.`,
    };
  const names = await db
    .select({ name: student.name, classId: enrollment.schoolClassId })
    .from(enrollment)
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(inArray(enrollment.id, skipped))
    .orderBy(student.name);
  return {
    ok: "Registro atualizado com sucesso",
    warning: `Sem nota: ${names.map((n) => `${n.name} (${n.classId ? "série sem matérias" : "sem turma"})`).join(", ")}.`,
  };
}
