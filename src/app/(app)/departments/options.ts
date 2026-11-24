import { asc } from "drizzle-orm";
import { db } from "@/db";
import { employeesEmployee } from "@/db/schema/app";

/** Every employee, by name, as teacher options (Django's DepartmentForm uses Employee.objects.all()). */
export async function teacherOptions(): Promise<[number, string][]> {
  const rows = await db
    .select({ id: employeesEmployee.id, name: employeesEmployee.name })
    .from(employeesEmployee)
    .orderBy(asc(employeesEmployee.name));
  return rows.map((r) => [r.id, r.name]);
}
