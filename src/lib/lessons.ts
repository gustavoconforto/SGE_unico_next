import { isoWeekday } from "./dates";

// Port of lessons/models.py: lessons run Monday to Saturday, 12 periods a day, 7 on Saturday.
export const LECTURES_PER_DAY = 12;
export const SATURDAY_LECTURES = 7;
export const SATURDAY = 6;
export const PERIODS = Array.from({ length: LECTURES_PER_DAY }, (_, i) => [i + 1, `${i + 1}ª aula`] as const);
export const WEEKDAYS = [
  [1, "Segunda-feira"],
  [2, "Terça-feira"],
  [3, "Quarta-feira"],
  [4, "Quinta-feira"],
  [5, "Sexta-feira"],
  [6, "Sábado"],
] as const;

/** The weekday's periods: Saturday has fewer. */
export const weekdayPeriods = (weekday: number) => (weekday === SATURDAY ? PERIODS.slice(0, SATURDAY_LECTURES) : PERIODS);

/** Why the weekday has no such period, or null. */
export const periodError = (weekday: number, period: number) =>
  weekday === SATURDAY && period > SATURDAY_LECTURES ? `O sábado tem só ${SATURDAY_LECTURES} aulas.` : null;

/** Why `day` can't have lectures of a class whose school year runs begins..ends, or null. */
export function lectureDateError(day: string, begins: string, ends: string) {
  if (isoWeekday(day) > SATURDAY) return "As aulas são de segunda a sábado.";
  if (day < begins || day > ends) return "A data está fora do ano escolar da turma.";
  return null;
}
