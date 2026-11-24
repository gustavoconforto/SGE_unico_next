// The three per-enrollment records (incident, delay, bathroom pass) share their list and form plumbing.
import { classesClass as klass } from "@/db/schema/app";
import { INVALID_CHOICE, foreignKey, requiredDate } from "@/lib/form";
import { studentName } from "../enrollments/data";

export const recordFields = { enrollmentId: foreignKey, incidentDate: requiredDate };

export const studentColumns = { student: studentName, className: klass.name, gradeLevel: klass.gradeLevel };

export const classCell = (c: { className: string | null; gradeLevel: number | null }) =>
  c.className ? `${c.gradeLevel ? `${c.gradeLevel}º ` : ""}${c.className}` : "—";

export const INVALID_ENROLLMENT = { enrollmentId: [INVALID_CHOICE] };
