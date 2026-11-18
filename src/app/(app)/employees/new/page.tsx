import type { Metadata } from "next";
import { requireSession } from "@/lib/session";
import { EmployeeForm } from "../employee-form";
import { roleOptions } from "../roles";

export const metadata: Metadata = { title: "Novo funcionário" };

export default async function NewEmployeePage() {
  const [roles, session] = await Promise.all([roleOptions(), requireSession()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo funcionário</h1>
      <EmployeeForm roles={roles} canManageLogin={session.user.role === "admin"} />
    </div>
  );
}
