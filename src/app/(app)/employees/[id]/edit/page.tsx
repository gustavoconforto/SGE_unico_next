import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { employeesEmployee } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { EmployeeForm } from "../../employee-form";
import { roleOptions } from "../../roles";

export const metadata: Metadata = { title: "Editar funcionário" };

export default async function EditEmployeePage({ params }: PageProps<"/employees/[id]/edit">) {
  const id = await idParam(params);
  const [[employee], roles] = await Promise.all([db.select().from(employeesEmployee).where(eq(employeesEmployee.id, id)), roleOptions()]);
  if (!employee) notFound();
  // Never send the SUGA password hash to the browser
  const { passwordSuga: _hidden, ...defaults } = employee;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar funcionário — {employee.name}</h1>
      <EmployeeForm id={id} defaults={defaults} roles={roles} />
    </div>
  );
}
