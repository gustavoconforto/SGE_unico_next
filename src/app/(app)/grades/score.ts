// One score cell (Django's score_field): optional, comma decimals, 0 to the exam's maximum, 2 places.
import Decimal from "decimal.js";
import { ExamKind, PASSING_GRADE, type Score, bimesterGrade, finalGrade, recoveryScore } from "@/lib/grades";

/** Two people saved the same sheet at once: the second save hits a unique grade constraint. */
export const SHEET_TAKEN =
  "Outra pessoa acabou de salvar notas nesta planilha. Recarregue a página e confira. Nenhuma nota foi salva.";

/** A sheet save that hit grades another person saved meanwhile: theirs are reloaded, the user's typing kept. */
export const SHEET_CHANGED =
  "Outra pessoa salvou notas nesta planilha enquanto você digitava. As notas dela já aparecem; confira as destacadas e salve de novo. Nenhuma nota foi salva.";
export const takenCell = (score: string) =>
  `Outra pessoa lançou ${scoreInput(score)} aqui. Salve de novo para manter o seu valor.`;

/** Cookie holding the last grade sheet opened (its query string), reopened on the next visit. */
export const LAST_SHEET = "grade_sheet";

export function parseScore(raw: string, maxScore: string): { score: string | null } | { error: string } {
  const v = raw.trim().replace(",", ".");
  if (!v) return { score: null };
  if (!/^\d{1,2}(\.\d{0,2})?$/.test(v) && !/^\.\d{1,2}$/.test(v)) {
    return /^\d*\.\d{3,}$/.test(v) ? { error: "Use no máximo 2 casas decimais." } : { error: "Informe um número." };
  }
  const n = new Decimal(v);
  if (n.gt(maxScore)) return { error: `A nota máxima é ${new Decimal(maxScore).toFixed(2).replace(".", ",")}.` };
  return { score: n.toFixed(2) };
}

/** Saved score as the inputs show it: "2,50". */
export const scoreInput = (score: string | null | undefined) =>
  score ? new Decimal(score).toFixed(2).replace(".", ",") : "";

/** Hidden input holding what a score cell showed when the page loaded. */
export const shownName = (name: string) => `shown_${name}`;

/**
 * What the user typed in a cell, or null when they left it as loaded or it wasn't on their page:
 * saving a sheet must not blank a grade someone else entered meanwhile.
 */
export function editedCell(values: Record<string, string>, name: string): string | null {
  const raw = values[name];
  if (raw === undefined) return null;
  const shown = values[shownName(name)];
  return shown !== undefined && shown.trim() === raw.trim() ? null : raw;
}

/** Same score whatever the typing ("7", "7,0", " 7,00"); anything unparseable compares as typed. */
export function sameScore(a: string, b: string): boolean {
  const norm = (v: string) => {
    const t = v.trim().replace(",", ".");
    return /^\d*\.?\d+$|^\d+\.$/.test(t) ? new Decimal(t).toFixed(2) : t;
  };
  return norm(a) === norm(b);
}

/** Text color for a computed grade: muted when missing, red below passing. */
export const gradeTone = (g: Decimal.Value | null) =>
  g === null ? "text-gray-400" : new Decimal(g).lt(PASSING_GRADE) ? "text-red-600" : "text-gray-900";

/** `calculated`: a staff-only score (concept, extra, adjustment) that teachers never type, so it never leaves a row incomplete. */
export type SheetCell = { kind: string; raw: string; maxScore: string; calculated?: boolean };

/** A cell a row still waits on: a blank regular or recovery score someone types. */
export const awaited = (c: SheetCell) => !c.calculated && c.kind !== ExamKind.BONUS && !c.raw.trim();

function sheetGrade(cells: SheetCell[], recovery: boolean, average: string | null) {
  const scores: Score[] = [];
  for (const c of cells) {
    const parsed = parseScore(c.raw, c.maxScore);
    if ("error" in parsed) return { invalid: true as const };
    if (parsed.score !== null) scores.push({ kind: c.kind, score: parsed.score });
  }
  return {
    grade: recovery
      ? finalGrade(average === null ? null : new Decimal(average), recoveryScore(scores))
      : bimesterGrade(scores),
  };
}

/**
 * A sheet row's grade from what is typed, as the server computes it after saving (sheet.ts):
 * the bimester grade, or in the final recovery the final grade from the annual `average`.
 * The grade is a sum, so a partial row is low by design: `atRisk` once the row is complete and below
 * passing, or while incomplete only when even full marks in every blank cell can't reach it.
 * `invalid`: a cell can't be saved (no result then).
 */
export function rowResult(cells: SheetCell[], recovery: boolean, average: string | null) {
  const now = sheetGrade(cells, recovery, average);
  if ("invalid" in now) return { result: null, invalid: true, incomplete: false, atRisk: false };
  // A blank adjustment stays blank in the best case: full marks there would replace the grade with 10
  const best = sheetGrade(
    cells.map((c) => (c.raw.trim() || c.kind === ExamKind.ADJUSTMENT ? c : { ...c, raw: c.maxScore })),
    recovery,
    average,
  );
  // An adjustment settles the grade, whatever is still blank
  const adjusted = cells.some((c) => c.kind === ExamKind.ADJUSTMENT && c.raw.trim());
  const incomplete = !adjusted && cells.some(awaited);
  const below = (g: Decimal | null | undefined) => g?.lt(PASSING_GRADE) === true;
  return {
    result: now.grade,
    invalid: false,
    incomplete,
    atRisk: below(now.grade) && (!incomplete || below("grade" in best ? best.grade : null)),
  };
}
