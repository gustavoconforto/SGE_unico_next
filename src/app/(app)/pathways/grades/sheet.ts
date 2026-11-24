import { and, asc, eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollmentsEnrollment as enrollment,
  pathwaysPathwayenrollment as member,
  pathwaysPathwaygrade as pathwayGrade,
  studentsStudent as student,
} from "@/db/schema/app";
import { bimesterRange } from "@/lib/concept-db";
import { attendanceRate } from "@/lib/pathways";
import { attendanceCounts } from "@/lib/pathways-db";
import { getOffering, membersBetween } from "../data";

/** PathwayGradeSheetForm: a row per student in the pathway during the bimester (every member without its dates). */
export async function loadPathwaySheet(offeringId: number, bimester: number) {
  const o = await getOffering(offeringId);
  if (!o || Number(o.p.extraPoints) <= 0) return null;
  const range = bimesterRange(o.y, bimester);
  const rows = await db
    .select({
      id: member.id,
      student: student.name,
      leftAt: member.leftAt,
      ...attendanceCounts(...(range ?? ["0001-01-01", "0001-01-01"])),
    })
    .from(member)
    .innerJoin(enrollment, eq(member.enrollmentId, enrollment.id))
    .innerJoin(student, eq(enrollment.studentId, student.id))
    .where(range ? membersBetween(offeringId, ...range) : eq(member.offeringId, offeringId))
    .orderBy(asc(student.name));
  const saved = rows.length
    ? await db
        .select()
        .from(pathwayGrade)
        .where(
          and(
            inArray(
              pathwayGrade.pathwayEnrollmentId,
              rows.map((r) => r.id),
            ),
            eq(pathwayGrade.bimester, bimester),
          ),
        )
    : [];
  return {
    offering: o,
    hasDates: !!range,
    maxScore: o.p.extraPoints,
    rows: rows.map((r) => ({
      ...r,
      rate: range ? attendanceRate(r.present, r.absent) : null,
      saved: saved.find((g) => g.pathwayEnrollmentId === r.id),
    })),
  };
}
