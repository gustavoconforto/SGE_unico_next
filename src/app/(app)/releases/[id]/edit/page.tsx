import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { releasesEarlyexit as t } from "@/db/schema/app";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { idParam } from "@/lib/list";
import { reasonOptions } from "../../reasons/options";
import { ExitForm } from "../../record-form";

export const metadata: Metadata = { title: "Editar liberação" };

export default async function EditExitPage({ params }: PageProps<"/releases/[id]/edit">) {
  await requirePermission("releases", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(t).where(eq(t.id, id));
  if (!row) notFound();
  const [enrollments, reasons] = await Promise.all([activeEnrollmentOptions(row.enrollmentId), reasonOptions()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar liberação</h1>
      <ExitForm id={id} defaults={row} enrollments={enrollments} reasons={reasons} />
    </div>
  );
}
