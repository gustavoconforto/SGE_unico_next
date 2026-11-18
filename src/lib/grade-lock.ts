// Who may edit which grades: teachers lose a subject's bimester once staff lock it, and never edit the
// computed or secretary-only exam types. Not in Django.
import { db } from "@/db";
import { gradesGradelock as lock } from "@/db/schema/app";
import { CONCEPT_CODE } from "./incidents";
import { EXTRA_CODE } from "./pathways";

/** Transfer adjustment: the annual grade a student brings from another school. */
export const ADJUSTMENT_CODE = "A";
export const STAFF_ONLY_CODES: readonly string[] = [CONCEPT_CODE, EXTRA_CODE, ADJUSTMENT_CODE];

export const LOCKED = "Lançamento encerrado para este bimestre. Fale com a secretaria.";
export const STAFF_ONLY = "Somente a secretaria pode lançar esta nota.";

/** Why this user can't edit this grade, or null. `staff`: holds grades.manage, and edits everything. */
export function gradeEditError(staff: boolean, locked: boolean, examCode: string): string | null {
  if (staff) return null;
  if (STAFF_ONLY_CODES.includes(examCode)) return STAFF_ONLY;
  return locked ? LOCKED : null;
}

/** Every lock, as "subjectId:bimester" keys. */
export async function allLocks() {
  return new Set((await db.select({ subjectId: lock.subjectId, bimester: lock.bimester }).from(lock)).map((r) => `${r.subjectId}:${r.bimester}`));
}
