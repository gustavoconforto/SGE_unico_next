"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import {
  departmentsDepartmentTeachers,
  employeesEmployee,
  gradesGradelevelsubjectTeachers,
  pathwaysPathwayofferingTeachers,
} from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { type FormState, foreignKey, parseForm } from "@/lib/form";
import { personFields, personUniqueError } from "@/lib/person";
import { requireSession } from "@/lib/session";

const employeeSchema = z.object({ ...personFields, roleId: foreignKey });

export async function saveEmployee(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(employeeSchema, formData);
  if (!data) return state;
  try {
    // SUGA access is not edited on this screen (same as Django's EmployeeForm)
    if (id === null) await db.insert(employeesEmployee).values({ ...data, canAccessSuga: false, passwordSuga: "" });
    else await db.update(employeesEmployee).set(data).where(eq(employeesEmployee.id, id));
  } catch (error) {
    const errors = personUniqueError(error);
    if (errors) return { errors, values };
    throw error;
  }
  redirect(`/employees?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteEmployee(id: number) {
  await requireSession();
  // Django drops the employee's M2M teacher links with it; any other reference (PROTECT) still blocks the delete
  await deleteAndRedirect(
    () =>
      db.transaction(async (tx) => {
        await tx.delete(departmentsDepartmentTeachers).where(eq(departmentsDepartmentTeachers.employeeId, id));
        await tx.delete(gradesGradelevelsubjectTeachers).where(eq(gradesGradelevelsubjectTeachers.employeeId, id));
        await tx.delete(pathwaysPathwayofferingTeachers).where(eq(pathwaysPathwayofferingTeachers.employeeId, id));
        await tx.delete(employeesEmployee).where(eq(employeesEmployee.id, id));
      }),
    "/employees",
  );
}
