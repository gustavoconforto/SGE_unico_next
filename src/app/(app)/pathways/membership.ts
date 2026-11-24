// PathwayEnrollment.clean(): left after joined, offering in the enrollment's school year, a free seat.
import { and, eq, isNull, ne, sql } from "drizzle-orm";
import { db } from "@/db";
import { INVALID_CHOICE } from "@/lib/form";
import {
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  pathwaysPathwayenrollment as member,
  pathwaysPathwayoffering as offering,
} from "@/db/schema/app";

export async function membershipErrors(m: {
  id?: number | null;
  enrollmentId: number;
  offeringId: number;
  joinedAt: string;
  leftAt: string | null;
}) {
  const errors: Record<string, string> = {};
  if (m.leftAt && m.leftAt < m.joinedAt) errors.leftAt = "A saída não pode ser antes da entrada.";
  const [[e], [o]] = await Promise.all([
    db
      .select({ schoolYearId: enrollmentType.schoolYearId })
      .from(enrollment)
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .where(eq(enrollment.id, m.enrollmentId)),
    db
      .select({ schoolYearId: offering.schoolYearId, capacity: offering.capacity })
      .from(offering)
      .where(eq(offering.id, m.offeringId)),
  ]);
  if (!e || !o) {
    errors.offeringId = INVALID_CHOICE;
    return errors;
  }
  if (e.schoolYearId !== o.schoolYearId) errors.offeringId = "O itinerário pertence a outro ano escolar.";
  else if (o.capacity !== null && m.leftAt === null) {
    const [{ taken }] = await db
      .select({ taken: sql<number>`count(*)::int` })
      .from(member)
      .where(and(eq(member.offeringId, m.offeringId), isNull(member.leftAt), m.id ? ne(member.id, m.id) : undefined));
    if (taken >= o.capacity) errors.offeringId = "Não há vagas nesta turma de itinerário.";
  }
  return errors;
}
