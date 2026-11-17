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
import { applyLoginPlan, employeeLogin, type LoginInput, loginPlan, usernameTaken } from "@/lib/employee-login";
import { checkbox, type FormState, foreignKey, parseForm } from "@/lib/form";
import { personFields, personUniqueError } from "@/lib/person";
import { requireSession } from "@/lib/session";

const employeeSchema = z.object({ ...personFields, roleId: foreignKey });
const loginSchema = z.object({
  access: checkbox,
  admin: checkbox,
  username: z.string().trim().toLowerCase().default(""),
  password: z.string().default(""),
});

export async function saveEmployee(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireSession();
  const { data, values, state } = parseForm(employeeSchema, formData);
  const login: LoginInput | null = session.user.role === "admin" ? loginSchema.parse(values) : null;
  delete values.password; // never echo a typed password back to the browser

  // Only admins grant dashboard access; anyone else's form has no login fields and leaves the login alone
  const current = login && id !== null ? await employeeLogin(id) : undefined;
  const { plan, errors: loginErrors = {} } = login ? loginPlan(login, !!current, current?.id === session.user.id) : { plan: "none" as const };
  if (login && (plan === "create" || plan === "update") && (await usernameTaken(login.username, current?.id)))
    loginErrors.username = ["Este usuário já está em uso."];

  const errors = { ...state?.errors, ...loginErrors };
  if (!data || Object.keys(errors).length) return { errors, values };

  let employeeId = id;
  try {
    // SUGA access is not edited on this screen (same as Django's EmployeeForm)
    if (id === null)
      [{ id: employeeId }] = await db
        .insert(employeesEmployee)
        .values({ ...data, canAccessSuga: false, passwordSuga: "" })
        .returning({ id: employeesEmployee.id });
    else await db.update(employeesEmployee).set(data).where(eq(employeesEmployee.id, id));
  } catch (error) {
    const errors = personUniqueError(error);
    if (errors) return { errors, values };
    throw error;
  }

  if (login && plan !== "none") {
    try {
      await applyLoginPlan(plan, { id: employeeId!, name: data.name }, login, current);
    } catch (error) {
      // Better Auth can't join the insert's transaction: undo a new employee so a failed save leaves nothing
      if (id === null) await db.delete(employeesEmployee).where(eq(employeesEmployee.id, employeeId!));
      throw error;
    }
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
