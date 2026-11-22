import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { RoleForm } from "../role-form";

export const metadata: Metadata = { title: "Novo cargo" };

export default async function NewRolePage() {
  await requirePermission("employees", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo cargo</h1>
      <RoleForm />
    </div>
  );
}
