import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { releasesExitreason as reason } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { ReasonForm } from "../../reason-form";

export const metadata: Metadata = { title: "Editar motivo" };

export default async function EditReasonPage({ params }: PageProps<"/releases/reasons/[id]/edit">) {
  await requirePermission("releases", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(reason).where(eq(reason.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar motivo</h1>
      <ReasonForm id={id} defaults={row} />
    </div>
  );
}
