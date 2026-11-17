import { asc, eq } from "drizzle-orm";
import { db } from "@/db";
import { departmentsDepartmentTeachers as departmentTeachers, employeesEmployee as employee } from "@/db/schema/app";
import { subjectOptions } from "../options";

export async function levelSubjectFormOptions() {
  const [subjects, links] = await Promise.all([
    subjectOptions(),
    db
      .select({ departmentId: departmentTeachers.departmentId, id: employee.id, name: employee.name })
      .from(departmentTeachers)
      .innerJoin(employee, eq(departmentTeachers.employeeId, employee.id))
      .orderBy(asc(employee.name)),
  ]);
  const teachersByDepartment: Record<number, [number, string][]> = {};
  for (const l of links) (teachersByDepartment[l.departmentId] ??= []).push([l.id, l.name]);
  return { subjects, teachersByDepartment };
}
