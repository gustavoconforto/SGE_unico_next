import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { departmentsDepartment as department, departmentsDepartmentTeachers as departmentTeachers } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { DepartmentForm } from "../../department-form";
import { teacherOptions } from "../../options";

export const metadata: Metadata = { title: "Editar departamento" };

export default async function EditDepartmentPage({ params }: PageProps<"/departments/[id]/edit">) {
  await requirePermission("academicSetup", "edit");
  const id = await idParam(params);
  const [[row], links, teachers] = await Promise.all([
    db.select().from(department).where(eq(department.id, id)),
    db.select({ employeeId: departmentTeachers.employeeId }).from(departmentTeachers).where(eq(departmentTeachers.departmentId, id)),
    teacherOptions(),
  ]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar departamento</h1>
      <DepartmentForm id={id} defaults={row} teacherIds={links.map((l) => l.employeeId)} teachers={teachers} />
    </div>
  );
}
