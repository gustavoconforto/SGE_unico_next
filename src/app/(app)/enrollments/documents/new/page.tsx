import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { DocumentTypeForm } from "../document-form";

export const metadata: Metadata = { title: "Novo documento" };

export default async function NewDocumentTypePage() {
  await requirePermission("enrollmentSetup", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo documento</h1>
      <DocumentTypeForm />
    </div>
  );
}
