// Port of grades/services.py: grades are computed from the scores on every request, never stored.
// Bimester grade = regular + bonus scores capped at 10 (recovery doesn't count); annual average =
// 20/30/20/30 weighted mean rounded to the half point; below 6 the final recovery is averaged in.
import Decimal from "decimal.js";

export const ExamKind = { REGULAR: "R", BONUS: "B", RECOVERY: "C" } as const;
export const EXAM_KINDS = [
  ["R", "Avaliação"],
  ["B", "Ponto extra"],
  ["C", "Recuperação"],
] as const;
export const BIMESTERS = [1, 2, 3, 4] as const;
/** Recovery grades live in a fifth period, taken once the year is over. */
export const FINAL_RECOVERY = 5;
export const GRADE_PERIODS = [
  [1, "1º bimestre"],
  [2, "2º bimestre"],
  [3, "3º bimestre"],
  [4, "4º bimestre"],
  [FINAL_RECOVERY, "Recuperação final"],
] as const;
export const GRADE_LEVELS = [
  [1, "1ª série"],
  [2, "2ª série"],
  [3, "3ª série"],
] as const;

export const MAX_GRADE = new Decimal(10);
export const PASSING_GRADE = new Decimal(6);
const WEIGHTS = ["0.2", "0.3", "0.2", "0.3"].map((w) => new Decimal(w));

export type Score = { kind: string; score: Decimal.Value };
type Grade = Decimal | null;

const cents = (v: Decimal) => v.toDecimalPlaces(2, Decimal.ROUND_HALF_UP);
/** .0 or .5, with .25 and .75 as thresholds (7.24 → 7.0, 7.25 → 7.5, 7.75 → 8.0). */
export const roundToHalf = (v: Decimal) => cents(v.div("0.5").toDecimalPlaces(0, Decimal.ROUND_HALF_UP).times("0.5"));

/** One subject in one bimester; null without a regular grade. */
export function bimesterGrade(scores: Score[]): Grade {
  let total = new Decimal(0);
  let hasRegular = false;
  for (const s of scores) {
    if (s.kind === ExamKind.RECOVERY) continue;
    total = total.plus(s.score);
    hasRegular ||= s.kind === ExamKind.REGULAR;
  }
  return hasRegular ? cents(Decimal.min(total, MAX_GRADE)) : null;
}

/** Best recovery score; null without one. */
export function recoveryScore(scores: Score[]): Grade {
  const r = scores.filter((s) => s.kind === ExamKind.RECOVERY).map((s) => new Decimal(s.score));
  return r.length ? Decimal.max(...r) : null;
}

/** Weighted mean of the four bimester grades, rounded to the half point; null while any is missing. */
export function finalAverage(bimesters: Grade[]): Grade {
  if (bimesters.length < 4 || bimesters.some((g) => g === null)) return null;
  return roundToHalf(bimesters.reduce((sum: Decimal, g, i) => sum.plus(g!.times(WEIGHTS[i])), new Decimal(0)));
}

export const needsRecovery = (average: Grade) => average !== null && average.lt(PASSING_GRADE);

/** Mean of average and recovery for a student below 6 (rounded to the half point); else the average. */
export function finalGrade(average: Grade, recovery: Grade): Grade {
  if (!needsRecovery(average) || recovery === null) return average;
  return roundToHalf(average!.plus(recovery).div(2));
}

/** null while the year or the recovery exam is still to come ("Em recuperação"). */
export function passed(average: Grade, recovery: Grade): boolean | null {
  if (average === null || (needsRecovery(average) && recovery === null)) return null;
  return finalGrade(average, recovery)!.gte(PASSING_GRADE);
}

/** A report card row from one subject's scores, grouped by period (1–4 and FINAL_RECOVERY). */
export function reportRow(byPeriod: Map<number, Score[]>) {
  const bimesters = BIMESTERS.map((b) => bimesterGrade(byPeriod.get(b) ?? []));
  const average = finalAverage(bimesters);
  const recovery = recoveryScore(byPeriod.get(FINAL_RECOVERY) ?? []);
  return { bimesters, average, recovery, final: finalGrade(average, recovery), needsRecovery: needsRecovery(average), passed: passed(average, recovery) };
}

/** "7,5" as the report card shows grades; "—" for none. */
export const formatGrade = (g: Decimal.Value | null | undefined) =>
  g === null || g === undefined ? "—" : new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(new Decimal(g).toNumber());
