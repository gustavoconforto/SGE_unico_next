"use server";

import { inArray, sql } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { gradesGrade as grade } from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import type { FormErrors, FormState } from "@/lib/form";
import { allLocks, gradeEditError } from "@/lib/grade-lock";
import { formValues } from "@/lib/form";
import { hasPermission, requirePermission } from "@/lib/access";
import { SHEET_CHANGED, editedCell, parseScore, takenCell } from "../score";
import { cellName, loadSheet } from "./sheet";

/** `saved`: when the last save went through, so the sheet can drop its edits and say so. */
export type SheetState = FormState & { saved?: number };

/**
 * Saves a whole sheet: blank cells delete the grade; any invalid cell saves nothing. The page reloads in
 * place (no redirect) so a conflict can keep what the user typed next to the grades saved meanwhile.
 */
export async function saveGradeSheet(selection: { query: string; classId: number; subjectId: number; period: number }, _prev: SheetState, formData: FormData): Promise<SheetState> {
  const { user } = await requirePermission("grades.edit");
  const [sheet, staff, locks] = await Promise.all([loadSheet(selection.classId, selection.subjectId, selection.period), hasPermission(user, "grades.manage"), allLocks()]);
  if (!sheet) redirect(`/grades/entry?${selection.query}`);
  const values = formValues(formData);
  const errors: FormErrors = {};
  const writes: { enrollmentId: number; examTypeId: number; score: string | null; savedId?: number }[] = [];
  for (const row of sheet.rows)
    for (const t of sheet.examTypes) {
      const name = cellName(row.id, t.id);
      const raw = editedCell(values, name);
      if (raw === null) continue;
      const denied = gradeEditError(staff, locks.has(`${selection.subjectId}:${selection.period}`), t.code);
      if (denied) {
        errors[name] = [denied];
        continue;
      }
      const parsed = parseScore(raw, t.maxScore);
      if ("error" in parsed) errors[name] = [parsed.error];
      else writes.push({ enrollmentId: row.id, examTypeId: t.id, score: parsed.score, savedId: row.saved[t.id]?.id });
    }
  if (Object.keys(errors).length) return { errors, values, formError: "Corrija as notas destacadas. Nenhuma nota foi salva." };

  try {
    // Three statements for the whole sheet, not one per cell. A plain insert (no upsert) still reports SHEET_TAKEN.
    const removed = writes.filter((w) => w.score === null && w.savedId).map((w) => w.savedId!);
    const changed = writes.filter((w) => w.score !== null && w.savedId);
    const added = writes.filter((w) => w.score !== null && !w.savedId);
    await db.transaction(async (tx) => {
      if (removed.length) await tx.delete(grade).where(inArray(grade.id, removed));
      if (changed.length)
        await tx
          .update(grade)
          .set({ score: sql`(case ${grade.id} ${sql.join(changed.map((w) => sql`when ${w.savedId} then ${w.score}::numeric`), sql` `)} end)` })
          .where(inArray(grade.id, changed.map((w) => w.savedId!)));
      if (added.length)
        await tx
          .insert(grade)
          .values(added.map((w) => ({ enrollmentId: w.enrollmentId, subjectId: selection.subjectId, examTypeId: w.examTypeId, bimester: selection.period, score: w.score! })));
    });
  } catch (error) {
    // Another save added the same grade a moment ago (unique_grade_per_exam)
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    // The cells this save meant to add that someone else filled meanwhile
    const now = await loadSheet(selection.classId, selection.subjectId, selection.period);
    const taken: FormErrors = {};
    for (const w of writes) {
      const theirs = !w.savedId && now?.rows.find((r) => r.id === w.enrollmentId)?.saved[w.examTypeId];
      if (theirs) taken[cellName(w.enrollmentId, w.examTypeId)] = [takenCell(theirs.score)];
    }
    refresh();
    return { values, errors: taken, formError: SHEET_CHANGED };
  }
  refresh();
  return { saved: Date.now() };
}
