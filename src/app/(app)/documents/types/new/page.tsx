import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { DocumentTypeForm } from "../type-form";

export const metadata: Metadata = { title: "Novo tipo de documento" };

export default async function NewDocumentTypePage() {
  await requirePermission("documents", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo tipo de documento</h1>
      <DocumentTypeForm />
    </div>
  );
}
