import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pathwaysPathway as pathway } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { PathwayForm } from "../../pathway-form";

export const metadata: Metadata = { title: "Editar itinerário" };

export default async function EditPathwayPage({ params }: PageProps<"/pathways/[id]/edit">) {
  await requirePermission("pathways", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(pathway).where(eq(pathway.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar itinerário</h1>
      <PathwayForm id={id} defaults={row} />
    </div>
  );
}
