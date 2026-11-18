"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { departmentsDepartment as department, departmentsDepartmentTeachers as departmentTeachers } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { FOREIGN_KEY_VIOLATION, UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, INVALID_CHOICE, formIds, parseForm, requiredText } from "@/lib/form";
import { requirePermission } from "@/lib/access";

const departmentSchema = z.object({ name: requiredText(50) });

export async function saveDepartment(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requirePermission("academicSetup.edit");
  const teacherIds = formIds(formData, "teachers");
  const { data, values, state } = parseForm(departmentSchema, formData);
  values.teachers = teacherIds.join(",");
  if (!data) return { ...state, values };

  try {
    await db.transaction(async (tx) => {
      let departmentId = id;
      if (departmentId === null) [{ id: departmentId }] = await tx.insert(department).values(data).returning({ id: department.id });
      else await tx.update(department).set(data).where(eq(department.id, departmentId));
      await tx.delete(departmentTeachers).where(eq(departmentTeachers.departmentId, departmentId));
      if (teacherIds.length) await tx.insert(departmentTeachers).values(teacherIds.map((employeeId) => ({ departmentId: departmentId!, employeeId })));
    });
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { name: ["Departamento com este Nome já existe."] }, values };
    // A teacher deleted while the form was open
    if (pgErrorCode(error) === FOREIGN_KEY_VIOLATION) return { formError: INVALID_CHOICE, values };
    throw error;
  }
  redirect(`/departments?msg=${id === null ? "created" : "updated"}`);
}

export async function deleteDepartment(id: number) {
  await requirePermission("academicSetup.edit");
  // Teacher links go with it (Django clears M2M rows); subjects are PROTECT
  await deleteAndRedirect(
    () =>
      db.transaction(async (tx) => {
        await tx.delete(departmentTeachers).where(eq(departmentTeachers.departmentId, id));
        await tx.delete(department).where(eq(department.id, id));
      }),
    "/departments",
    "department_protected",
  );
}
