"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { pathwaysPathwaygrade as pathwayGrade } from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormErrors, type FormState, formValues } from "@/lib/form";
import { requireSession } from "@/lib/session";
import { SHEET_TAKEN, editedCell, parseScore } from "../../grades/score";
import { loadPathwaySheet } from "./sheet";

/** Saves the whole sheet: blank cells delete the grade; any invalid cell saves nothing. */
export async function savePathwaySheet(sel: { query: string; offeringId: number; bimester: number }, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const sheet = await loadPathwaySheet(sel.offeringId, sel.bimester);
  if (!sheet) redirect(`/pathways/grades?${sel.query}`);
  const values = formValues(formData);
  const errors: FormErrors = {};
  const writes: { id: number; score: string | null; saved?: { id: number; score: string } }[] = [];
  for (const r of sheet.rows) {
    const raw = editedCell(values, `score_${r.id}`);
    if (raw === null) continue;
    const parsed = parseScore(raw, sheet.maxScore);
    if ("error" in parsed) errors[`score_${r.id}`] = [parsed.error];
    else writes.push({ id: r.id, score: parsed.score, saved: r.saved });
  }
  if (Object.keys(errors).length) return { errors, values, formError: "Corrija as notas destacadas. Nenhuma nota foi salva." };
  try {
    await db.transaction(async (tx) => {
      for (const w of writes) {
        if (w.score === null) {
          if (w.saved) await tx.delete(pathwayGrade).where(eq(pathwayGrade.id, w.saved.id));
        } else if (!w.saved) await tx.insert(pathwayGrade).values({ pathwayEnrollmentId: w.id, bimester: sel.bimester, score: w.score });
        else if (w.saved.score !== w.score) await tx.update(pathwayGrade).set({ score: w.score }).where(eq(pathwayGrade.id, w.saved.id));
      }
    });
  } catch (error) {
    // Another save added the same grade a moment ago (unique_pathway_grade_per_bimester)
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    return { values, formError: SHEET_TAKEN };
  }
  redirect(`/pathways/grades?${sel.query}&msg=updated`);
}
