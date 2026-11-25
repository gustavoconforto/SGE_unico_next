// Roll call statuses (Django's pathways AttendanceStatus) and the class roll call's rules (not in Django).
import { lectureDateError } from "./lessons";

export const ATTENDANCE_STATUSES = [
  ["P", "Presente"],
  ["F", "Falta"],
  ["J", "Falta justificada"],
] as const;
export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number][0];

export const isAttendanceStatus = (s: string): s is AttendanceStatus => ATTENDANCE_STATUSES.some(([c]) => c === s);

/** The status a roll call cell moves to on a click: Presente → Falta → Falta justificada → Presente. */
export function nextStatus(s: AttendanceStatus): AttendanceStatus {
  const i = ATTENDANCE_STATUSES.findIndex(([c]) => c === s);
  return ATTENDANCE_STATUSES[(i + 1) % ATTENDANCE_STATUSES.length][0];
}

/** Longest note a student's day keeps. */
export const ATTENDANCE_NOTE_MAX = 500;

/** Why a class's roll call can't be taken on `day` (school year begins..ends), or null. */
export function attendanceDateError(day: string, begins: string, ends: string, schoolDay: boolean, today: string) {
  const error = lectureDateError(day, begins, ends);
  if (error) return error;
  if (day > today) return "A chamada só pode ser feita até o dia de hoje.";
  if (!schoolDay) return "O dia não é letivo no calendário.";
  return null;
}
