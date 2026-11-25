import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { SupplierForm } from "../supplier-form";

export const metadata: Metadata = { title: "Novo fornecedor" };

export default async function NewSupplierPage() {
  await requirePermission("payables", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo fornecedor</h1>
      <SupplierForm />
    </div>
  );
}
