import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { GuardianForm } from "../guardian-form";

export const metadata: Metadata = { title: "Novo responsável" };

export default async function NewGuardianPage() {
  await requirePermission("students", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo responsável</h1>
      <GuardianForm />
    </div>
  );
}
