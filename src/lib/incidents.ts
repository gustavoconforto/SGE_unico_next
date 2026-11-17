// Port of incidents/services.py concept_grade: the behaviour ("conceito") grade of a bimester.
import Decimal from "decimal.js";

export const CONCEPT_CODE = "C";
const CONCEPT_START = new Decimal(1);
/** Tolerated delays beyond this count cost DELAY_PENALTY each. */
const TOLERATED_DELAYS = 2;
const DELAY_PENALTY = new Decimal("0.2");

export function conceptGrade(penalties: Decimal.Value, acceptableDelays: number): Decimal {
  const extra = Math.max(acceptableDelays - TOLERATED_DELAYS, 0);
  return Decimal.max(CONCEPT_START.minus(penalties).minus(DELAY_PENALTY.times(extra)), 0);
}

export const DELAY_TYPES = [
  ["A", "Tolerado"],
  ["U", "Não tolerado"],
] as const;
