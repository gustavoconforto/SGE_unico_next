/** YYYY-MM-DD plus n days (UTC, so no DST surprises). */
export function addDays(day: string, n: number): string {
  const d = new Date(`${day}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}

/** ISO weekday (Monday 1 … Sunday 7) of a YYYY-MM-DD date. */
export const isoWeekday = (day: string) => new Date(`${day}T00:00:00Z`).getUTCDay() || 7;

/** Moves a Saturday/Sunday due date (YYYY-MM-DD) to the next Monday. */
export const adjustWeekend = (dueDate: string) =>
  addDays(dueDate, ({ 6: 2, 7: 1 } as Record<number, number>)[isoWeekday(dueDate)] ?? 0);
