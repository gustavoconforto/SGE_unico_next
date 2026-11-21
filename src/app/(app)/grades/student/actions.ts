"use server";

import { and, eq } from "drizzle-orm";
import { db } from "@/db";
import { gradesGrade as grade } from "@/db/schema/app";
import { type FormErrors, formValues } from "@/lib/form";
import { allLocks, gradeEditError } from "@/lib/grade-lock";
import { loadReportCard } from "../report";
import { editedCell, parseScore } from "../score";
import { FINAL_RECOVERY } from "@/lib/grades";
import { requireSession } from "@/lib/session";

export type RowState = { errors?: FormErrors; values?: Record<string, string>; formError?: string; saved?: number };

/** One subject's scores of one enrollment (StudentSubjectGradesForm): a cell blanked deletes; any invalid saves nothing. */
export async function saveSubjectGrades(enrollmentId: number, subjectId: number, prev: RowState, formData: FormData): Promise<RowState> {
  await requireSession();
  const [card, staff, locks] = await Promise.all([loadReportCard(enrollmentId), true, allLocks()]);
  if (!card || card.enrollment.status !== "A" || !card.rows.some((r) => r.subject.id === subjectId)) return { formError: "Matéria ou matrícula inválida." };
  const periods = [...[1, 2, 3, 4].map((b) => [b, card.examTypes] as const), [FINAL_RECOVERY, card.recoveryTypes] as const];
  const values = formValues(formData);
  const errors: FormErrors = {};
  const cells: { bimester: number; examTypeId: number; score: string | null }[] = [];
  for (const [bimester, types] of periods)
    for (const t of types) {
      const name = `score_${bimester}_${t.id}`;
      // Only cells the user changed: an untouched one must not undo a grade entered meanwhile in the class sheet
      const raw = editedCell(values, name);
      if (raw === null) continue;
      const denied = gradeEditError(staff, locks.has(`${subjectId}:${bimester}`), t);
      if (denied) {
        errors[name] = [denied];
        continue;
      }
      const parsed = parseScore(raw, t.maxScore);
      if ("error" in parsed) errors[name] = [parsed.error];
      else cells.push({ bimester, examTypeId: t.id, score: parsed.score });
    }
  if (Object.keys(errors).length) return { errors, values, formError: "Corrija as notas destacadas. Nenhuma nota foi salva." };

  const where = (c: (typeof cells)[number]) => and(eq(grade.enrollmentId, enrollmentId), eq(grade.subjectId, subjectId), eq(grade.bimester, c.bimester), eq(grade.examTypeId, c.examTypeId));
  await db.transaction(async (tx) => {
    for (const c of cells) {
      if (c.score === null) await tx.delete(grade).where(where(c));
      else
        await tx
          .insert(grade)
          .values({ enrollmentId, subjectId, bimester: c.bimester, examTypeId: c.examTypeId, score: c.score })
          .onConflictDoUpdate({ target: [grade.enrollmentId, grade.subjectId, grade.examTypeId, grade.bimester], set: { score: c.score, updatedAt: new Date().toISOString() } });
    }
  });
  return { saved: (prev.saved ?? 0) + 1 };
}
