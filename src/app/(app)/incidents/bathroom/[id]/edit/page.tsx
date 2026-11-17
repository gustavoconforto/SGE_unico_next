import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { incidentsBathroompermission as t } from "@/db/schema/app";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { idParam } from "@/lib/list";
import { RecordForm } from "../../record-form";

export const metadata: Metadata = { title: "Editar saída para banheiro" };

export default async function EditRecordPage({ params }: PageProps<"/incidents/bathroom/[id]/edit">) {
  const id = await idParam(params);
  const [row] = await db.select().from(t).where(eq(t.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar saída para banheiro</h1>
      <RecordForm id={id} defaults={row} enrollments={await activeEnrollmentOptions(row.enrollmentId)} />
    </div>
  );
}
