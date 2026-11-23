import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { DepartmentForm } from "../department-form";
import { teacherOptions } from "../options";

export const metadata: Metadata = { title: "Novo departamento" };

export default async function NewDepartmentPage() {
  await requirePermission("academicSetup", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo departamento</h1>
      <DepartmentForm teachers={await teacherOptions()} />
    </div>
  );
}
