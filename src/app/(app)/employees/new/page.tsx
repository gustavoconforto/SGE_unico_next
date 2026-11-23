import type { Metadata } from "next";
import { requireAdmin } from "@/lib/authorization";
import { EmployeeForm } from "../employee-form";
import { roleOptions } from "../roles";

export const metadata: Metadata = { title: "Novo funcionário" };

export default async function NewEmployeePage() {
  const [roles] = await Promise.all([roleOptions(), requireAdmin()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo funcionário</h1>
      <EmployeeForm roles={roles} />
    </div>
  );
}
