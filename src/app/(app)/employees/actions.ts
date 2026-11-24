"use server";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
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
import { applyLoginPlan, employeeLogin, loginPlan, usernameTaken } from "@/lib/employee-login";
import { checkbox, type FormState, foreignKey, parseForm } from "@/lib/form";
import { personFields, personUniqueError } from "@/lib/person";
import { auth } from "@/lib/auth";
import { requireAdmin } from "@/lib/authorization";
import { type AssignableRole, ROLE_LABELS } from "@/lib/permissions";

const employeeSchema = z.object({ ...personFields, roleId: foreignKey });
const loginSchema = z.object({
  access: checkbox,
  username: z.string().trim().toLowerCase().default(""),
  password: z.string().default(""),
});

// Admins only, not requirePermission("employees", ...): this form creates logins and resets passwords, so
// anyone else holding it could take over an admin's account
export async function saveEmployee(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  const session = await requireAdmin();
  const { data, values, state } = parseForm(employeeSchema, formData);
  const login = loginSchema.parse(values);
  delete values.password; // never echo a typed password back to the browser

  const current = id !== null ? await employeeLogin(id) : undefined;
  const { plan, errors: loginErrors = {} } = loginPlan(login, !!current, current?.id === session.user.id);
  if ((plan === "create" || plan === "update") && (await usernameTaken(login.username, current?.id)))
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

  if (plan !== "none") {
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
  const session = await requireAdmin();
  // Deleting the employee deletes their login (FK cascade): an admin can't delete their own
  if ((await employeeLogin(id))?.id === session.user.id) redirect("/employees?msg=employee_has_login");
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

/** The roles picked on the list's multiselect replace the login's roles; none picked leaves it plain "user". */
export async function setUserRoles(userId: string, formData: FormData) {
  const session = await requireAdmin();
  const picked = formData
    .getAll("role")
    .filter((r): r is AssignableRole => typeof r === "string" && Object.hasOwn(ROLE_LABELS, r));
  if (userId === session.user.id && !picked.includes("admin")) redirect("/employees?msg=own_admin");
  await auth.api.setRole({ body: { userId, role: picked.length ? picked : "user" }, headers: await headers() });
  redirect("/employees?msg=updated");
}
