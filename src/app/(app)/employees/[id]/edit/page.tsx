import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { employeesEmployee } from "@/db/schema/app";
import { employeeLogin } from "@/lib/employee-login";
import { idParam } from "@/lib/list";
import { requireAdmin } from "@/lib/authorization";
import { EmployeeForm } from "../../employee-form";
import { roleOptions } from "../../roles";

export const metadata: Metadata = { title: "Editar funcionário" };

export default async function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  const id = await idParam(params);
  const [[employee], roles, , login] = await Promise.all([
    db.select().from(employeesEmployee).where(eq(employeesEmployee.id, id)),
    roleOptions(),
    requireAdmin(),
    employeeLogin(id),
  ]);
  if (!employee) notFound();
  // Never send the SUGA password hash to the browser
  const { passwordSuga: _hidden, ...person } = employee;
  const defaults = login ? { ...person, access: true, username: login.username } : person;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar funcionário — {employee.name}</h1>
      <EmployeeForm id={id} defaults={defaults} roles={roles} />
    </div>
  );
}
