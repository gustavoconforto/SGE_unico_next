// Database side of pathways/services.py: attendance counts, workload and the extra grade.
import { and, eq, gt, inArray, sql, sum } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  pathwaysPathway as pathway,
  pathwaysPathwayenrollment as member,
  pathwaysPathwaygrade as pathwayGrade,
  pathwaysPathwayoffering as offering,
} from "@/db/schema/app";
import { bimesterRange } from "./concept-db";
import { extraGrade, workload } from "./pathways";
import { ref } from "./sql";

/** with_attendance(): lessons in [from, to] attended, missed and excused, per pathway enrollment row. */
export function attendanceCounts(from: string, to: string) {
  const c = (status: string) =>
    sql<number>`(select count(*) from pathways_pathwayattendance a join pathways_pathwaysession s on s.id = a.session_id where a.pathway_enrollment_id = ${ref(member.id)} and a.status = ${status} and s.date between ${from} and ${to})::int`;
  return { present: c("P"), absent: c("F"), excused: c("J") };
}

/** with_workload(): an enrollment's pathway memberships in its school year, each with its hours. */
export async function enrollmentWorkload(enrollmentId: number) {
  const [e] = await db
    .select({ begins: year.begins, ends: year.ends })
    .from(enrollment)
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .where(eq(enrollment.id, enrollmentId));
  if (!e) return null;
  const rows = await db
    .select({
      id: member.id,
      joinedAt: member.joinedAt,
      leftAt: member.leftAt,
      pathway: pathway.name,
      offeringName: offering.name,
      offeringYear: sql<number>`(select extract(year from y.begins)::int from enrollments_schoolyear y where y.id = ${ref(offering.schoolYearId)})`,
      workloadType: pathway.workloadType,
      workloadHours: pathway.workloadHours,
      ...attendanceCounts(e.begins, e.ends),
    })
    .from(member)
    .innerJoin(offering, eq(member.offeringId, offering.id))
    .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
    .where(eq(member.enrollmentId, enrollmentId))
    .orderBy(pathway.name);
  return rows.map((r) => ({ ...r, workload: workload(r.workloadType, r.workloadHours, r.present) }));
}

/** extra_grades(): {enrollment id: extra grade} for the bimester; enrollments whose year lacks its dates are left out. */
export async function extraGrades(enrollmentIds: number[], bimester: number, maxScore: string) {
  const grades = new Map<number, string>();
  if (!enrollmentIds.length) return grades;
  const rows = await db
    .select({ id: enrollment.id, y: year })
    .from(enrollment)
    .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
    .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
    .where(inArray(enrollment.id, enrollmentIds));
  // Grades left in a pathway that no longer gives an extra grade don't count
  const totals = await db
    .select({ id: member.enrollmentId, total: sum(pathwayGrade.score) })
    .from(pathwayGrade)
    .innerJoin(member, eq(pathwayGrade.pathwayEnrollmentId, member.id))
    .innerJoin(offering, eq(member.offeringId, offering.id))
    .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
    .where(
      and(
        inArray(member.enrollmentId, enrollmentIds),
        gt(pathway.extraPoints, "0"),
        eq(pathwayGrade.bimester, bimester),
      ),
    )
    .groupBy(member.enrollmentId);
  const totalOf = new Map(totals.map((t) => [t.id, t.total]));
  for (const r of rows) {
    if (!bimesterRange(r.y, bimester)) continue;
    grades.set(r.id, extraGrade(totalOf.get(r.id) ?? "0", maxScore).toFixed(2));
  }
  return grades;
}
