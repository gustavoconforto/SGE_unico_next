import { asc } from "drizzle-orm";
import { db } from "@/db";
import { employeesEmployee as employee, pathwaysPathway as pathway } from "@/db/schema/app";
import { yearOptions } from "../../classes/options";

export async function offeringFormOptions() {
  const [pathways, years, teachers] = await Promise.all([
    db.select({ id: pathway.id, name: pathway.name }).from(pathway).orderBy(asc(pathway.name)),
    yearOptions(),
    db.select({ id: employee.id, name: employee.name }).from(employee).orderBy(asc(employee.name)),
  ]);
  return {
    pathways: pathways.map((p) => [p.id, p.name] as [number, string]),
    years,
    teachers: teachers.map((t) => [t.id, t.name] as [number, string]),
  };
}
