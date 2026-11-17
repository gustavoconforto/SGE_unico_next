import { asc, desc, sql } from "drizzle-orm";
import { db } from "@/db";
import { enrollmentsSchoolyear as year, programsProgram as program } from "@/db/schema/app";

/** SchoolYear.__str__ is the year it begins. */
export const yearLabel = sql<string>`extract(year from ${year.begins})::text`;

export async function yearOptions(): Promise<[number, string][]> {
  const rows = await db.select({ id: year.id, label: yearLabel }).from(year).orderBy(desc(year.begins));
  return rows.map((r) => [r.id, r.label]);
}

export async function programOptions(): Promise<[number, string][]> {
  const rows = await db.select({ id: program.id, name: program.name }).from(program).orderBy(asc(program.name));
  return rows.map((r) => [r.id, r.name]);
}
