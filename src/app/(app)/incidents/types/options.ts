import { asc } from "drizzle-orm";
import { db } from "@/db";
import { incidentsIncidenttype as incidentType } from "@/db/schema/app";

export async function incidentTypeOptions(): Promise<[number, string][]> {
  return (await db.select().from(incidentType).orderBy(asc(incidentType.type))).map((t) => [t.id, t.type]);
}
