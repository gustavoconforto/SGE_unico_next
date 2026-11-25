// School calendar (not in Django): the days of a school year and whether each counts as a school day.
import { addDays, isoWeekday } from "./dates";

const utc = (day: string) => new Date(`${day}T00:00:00Z`);

/** The "YYYY-MM" months a school year (YYYY-MM-DD bounds) touches, in order. */
export function yearMonths(begins: string, ends: string): string[] {
  const months: string[] = [];
  for (let m = begins.slice(0, 7); m <= ends.slice(0, 7); m = addDays(`${m}-28`, 7).slice(0, 7)) months.push(m);
  return months;
}

/** The days of a "YYYY-MM" month that fall inside the school year. */
export function monthDays(month: string, begins: string, ends: string): string[] {
  const days: string[] = [];
  for (let d = `${month}-01`; d.startsWith(month); d = addDays(d, 1)) if (d >= begins && d <= ends) days.push(d);
  return days;
}

/** A day nobody has set yet counts as a school day from Monday to Friday. */
export const defaultSchoolDay = (day: string) => isoWeekday(day) <= 5;

export const weekdayName = (day: string) => utc(day).toLocaleDateString("pt-BR", { weekday: "long", timeZone: "UTC" });

export const monthName = (month: string) =>
  utc(`${month}-01`).toLocaleDateString("pt-BR", { month: "long", year: "numeric", timeZone: "UTC" });
