"use server";

import { and, eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { gradesGrade as grade } from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import type { FormErrors, FormState } from "@/lib/form";
import { formValues } from "@/lib/form";
import { requireSession } from "@/lib/session";
import { SHEET_TAKEN, editedCell, parseScore } from "../score";
import { cellName, loadSheet } from "./sheet";

/** Saves a whole sheet: blank cells delete the grade; any invalid cell saves nothing. */
export async function saveGradeSheet(selection: { query: string; classId: number; subjectId: number; period: number }, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const sheet = await loadSheet(selection.classId, selection.subjectId, selection.period);
  if (!sheet) redirect(`/grades/entry?${selection.query}`);
  const values = formValues(formData);
  const errors: FormErrors = {};
  const writes: { enrollmentId: number; examTypeId: number; score: string | null; savedId?: number }[] = [];
  for (const row of sheet.rows)
    for (const t of sheet.examTypes) {
      const name = cellName(row.id, t.id);
      const raw = editedCell(values, name);
      if (raw === null) continue;
      const parsed = parseScore(raw, t.maxScore);
      if ("error" in parsed) errors[name] = [parsed.error];
      else writes.push({ enrollmentId: row.id, examTypeId: t.id, score: parsed.score, savedId: row.saved[t.id]?.id });
    }
  if (Object.keys(errors).length) return { errors, values, formError: "Corrija as notas destacadas. Nenhuma nota foi salva." };

  try {
    await db.transaction(async (tx) => {
      for (const w of writes) {
        if (w.score === null) {
          if (w.savedId) await tx.delete(grade).where(eq(grade.id, w.savedId));
        } else if (w.savedId) {
          await tx.update(grade).set({ score: w.score }).where(and(eq(grade.id, w.savedId), eq(grade.enrollmentId, w.enrollmentId)));
        } else {
          await tx.insert(grade).values({ enrollmentId: w.enrollmentId, subjectId: selection.subjectId, examTypeId: w.examTypeId, bimester: selection.period, score: w.score });
        }
      }
    });
  } catch (error) {
    // Another save added the same grade a moment ago (unique_grade_per_exam)
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    return { values, formError: SHEET_TAKEN };
  }
  redirect(`/grades/entry?${selection.query}&msg=updated`);
}
