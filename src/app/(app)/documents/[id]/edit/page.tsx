import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { documentsReceiveddocument as t } from "@/db/schema/app";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { idParam } from "@/lib/list";
import { documentTypeOptions } from "../../types/options";
import { ReceivedDocumentForm } from "../../record-form";

export const metadata: Metadata = { title: "Editar documento recebido" };

export default async function EditReceivedDocumentPage({ params }: PageProps<"/documents/[id]/edit">) {
  await requirePermission("documents", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(t).where(eq(t.id, id));
  if (!row) notFound();
  const [enrollments, types] = await Promise.all([activeEnrollmentOptions(row.enrollmentId), documentTypeOptions()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar documento recebido</h1>
      <ReceivedDocumentForm id={id} defaults={row} enrollments={enrollments} types={types} />
    </div>
  );
}
