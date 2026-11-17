import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { employeesEmployeeroletype } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { RoleForm } from "../../role-form";

export const metadata: Metadata = { title: "Editar cargo" };

export default async function EditRolePage({ params }: PageProps<"/employees/roles/[id]/edit">) {
  const id = await idParam(params);
  const [role] = await db.select().from(employeesEmployeeroletype).where(eq(employeesEmployeeroletype.id, id));
  if (!role) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar cargo</h1>
      <RoleForm id={id} defaults={role} />
    </div>
  );
}
