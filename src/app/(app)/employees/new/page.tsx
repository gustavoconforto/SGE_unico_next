import type { Metadata } from "next";
import { EmployeeForm } from "../employee-form";
import { roleOptions } from "../roles";

export const metadata: Metadata = { title: "Novo funcionário" };

export default async function NewEmployeePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo funcionário</h1>
      <EmployeeForm roles={await roleOptions()} />
    </div>
  );
}
