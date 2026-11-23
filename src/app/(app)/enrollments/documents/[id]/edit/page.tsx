import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { enrollmentsNeededdocumenttype as documentType } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { DocumentTypeForm } from "../../document-form";

export const metadata: Metadata = { title: "Editar documento" };

export default async function EditDocumentTypePage({ params }: PageProps<"/enrollments/documents/[id]/edit">) {
  await requirePermission("enrollmentSetup", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(documentType).where(eq(documentType.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar documento</h1>
      <DocumentTypeForm id={id} defaults={row} />
    </div>
  );
}
