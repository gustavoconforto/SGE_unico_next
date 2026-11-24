// Port of pathways/services.py and the pathway choices.
import Decimal from "decimal.js";
import { addDays, isoWeekday } from "./dates";

export const EXTRA_CODE = "EX";
/** A lesson lasts 45 minutes. */
export const LECTURE_HOURS = new Decimal(45).div(60);

export const WORKLOAD_TYPES = [
  ["N", "Sem carga horária"],
  ["F", "Fixa"],
  ["P", "Por presença"],
] as const;
export const ATTENDANCE_STATUSES = [
  ["P", "Presente"],
  ["F", "Falta"],
  ["J", "Falta justificada"],
] as const;

/** Hours a pathway membership earns: the fixed hours, or 45 minutes per lesson attended (excused earns nothing). */
export function workload(workloadType: string, workloadHours: Decimal.Value, present: number): Decimal {
  if (workloadType === "F") return new Decimal(workloadHours);
  if (workloadType === "P") return LECTURE_HOURS.times(present);
  return new Decimal(0);
}

/** Percentage of lessons attended (excused left out); null without lessons. */
export function attendanceRate(present: number, absent: number): Decimal | null {
  const lessons = present + absent;
  return lessons ? new Decimal(100).times(present).div(lessons) : null;
}

/** The dates from `begins` to `ends` that fall on the offering's ISO weekdays. */
export function lessonDays(weekdays: number[], begins: string, ends: string): string[] {
  const days: string[] = [];
  for (let d = begins; d <= ends; d = addDays(d, 1)) {
    if (weekdays.includes(isoWeekday(d))) days.push(d);
  }
  return days;
}

/** The extra grade: the bimester's pathway grades added up, capped at the EX exam's maximum. */
export const extraGrade = (pathwayPoints: Decimal.Value, maxScore: Decimal.Value) =>
  Decimal.min(new Decimal(pathwayPoints), new Decimal(maxScore));

/** Whether a membership (joined..left) covers `day`. */
export const isMemberOn = (m: { joinedAt: string; leftAt: string | null }, day: string) =>
  m.joinedAt <= day && (m.leftAt === null || day <= m.leftAt);

/** "1,5" hours. */
export const formatHours = (h: Decimal.Value) =>
  new Intl.NumberFormat("pt-BR", { maximumFractionDigits: 2 }).format(new Decimal(h).toNumber());
