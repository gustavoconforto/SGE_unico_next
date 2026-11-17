// Labels and queries shared by the pathway screens.
import { and, asc, desc, eq, gte, isNull, lte, or, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  enrollmentsSchoolyear as year,
  pathwaysPathway as pathway,
  pathwaysPathwayenrollment as member,
  pathwaysPathwayoffering as offering,
} from "@/db/schema/app";
import { ref } from "@/lib/sql";

/** PathwayOffering.__str__: "Robótica 2026 - Manhã". */
export const offeringLabel = (o: { pathway: string; year: number | string; name: string }) => `${o.pathway} ${o.year}${o.name ? ` - ${o.name}` : ""}`;

export const offeringYear = sql<number>`extract(year from ${year.begins})::int`;

/** Members without a leaving date (the seats taken). */
export const seatsTaken = sql<number>`(select count(*) from pathways_pathwayenrollment m where m.offering_id = ${ref(offering.id)} and m.left_at is null)::int`;

export async function offeringOptions(filter?: { schoolYearId?: number; givesGrade?: boolean }) {
  const rows = await db
    .select({ id: offering.id, name: offering.name, pathway: pathway.name, year: offeringYear, schoolYearId: offering.schoolYearId, capacity: offering.capacity, schedule: offering.schedule, extraPoints: pathway.extraPoints, taken: seatsTaken })
    .from(offering)
    .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
    .innerJoin(year, eq(offering.schoolYearId, year.id))
    .where(and(filter?.schoolYearId ? eq(offering.schoolYearId, filter.schoolYearId) : undefined, filter?.givesGrade ? sql`${pathway.extraPoints} > 0` : undefined))
    .orderBy(desc(year.begins), asc(pathway.name), asc(offering.name));
  return rows.map((r) => ({ ...r, label: offeringLabel(r) }));
}

export async function getOffering(id: number) {
  const [o] = await db
    .select({ o: offering, p: pathway, y: year, year: offeringYear })
    .from(offering)
    .innerJoin(pathway, eq(offering.pathwayId, pathway.id))
    .innerJoin(year, eq(offering.schoolYearId, year.id))
    .where(eq(offering.id, id));
  return o ? { ...o, label: offeringLabel({ pathway: o.p.name, year: o.year, name: o.o.name }) } : null;
}

/** Memberships of the offering at some point between the dates (members_between / members_on). */
export const membersBetween = (offeringId: number, begins: string, ends: string) =>
  and(eq(member.offeringId, offeringId), lte(member.joinedAt, ends), or(isNull(member.leftAt), gte(member.leftAt, begins)));
