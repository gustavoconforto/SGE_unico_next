import { asc } from "drizzle-orm";
import { db } from "@/db";
import { departmentsDepartment as department, gradesSubject as subject } from "@/db/schema/app";

export async function departmentOptions(): Promise<[number, string][]> {
  return (
    await db.select({ id: department.id, name: department.name }).from(department).orderBy(asc(department.name))
  ).map((d) => [d.id, d.name]);
}

export async function subjectOptions() {
  return db
    .select({ id: subject.id, name: subject.name, departmentId: subject.departmentId })
    .from(subject)
    .orderBy(asc(subject.name));
}
