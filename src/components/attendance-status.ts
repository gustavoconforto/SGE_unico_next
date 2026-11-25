// How roll call statuses look: shared by the pathway roll call and the class roll call.
import type { AttendanceStatus } from "@/lib/attendance";

export const STATUS_SHORT = { P: "Presente", F: "Falta", J: "Justificada" } as const satisfies Record<
  AttendanceStatus,
  string
>;

/** Colours of a chosen status: Presente is the quiet default, so absences stand out when scanning a roll call. */
export const STATUS_COLOR = {
  P: "border-primary-600 bg-primary-50 text-primary-800",
  F: "border-red-700 bg-red-700 text-white",
  J: "border-amber-600 bg-amber-100 text-amber-900",
} as const satisfies Record<AttendanceStatus, string>;
