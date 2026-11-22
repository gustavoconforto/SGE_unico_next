import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pathwaysPathwayoffering as offering, pathwaysPathwayofferingTeachers as offeringTeachers } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { OfferingForm } from "../../offering-form";
import { offeringFormOptions } from "../../options";

export const metadata: Metadata = { title: "Editar turma de itinerário" };

export default async function EditOfferingPage({ params }: PageProps<"/pathways/offerings/[id]/edit">) {
  await requirePermission("pathways", "edit");
  const id = await idParam(params);
  const [[row], links, options] = await Promise.all([
    db.select().from(offering).where(eq(offering.id, id)),
    db.select({ id: offeringTeachers.employeeId }).from(offeringTeachers).where(eq(offeringTeachers.pathwayofferingId, id)),
    offeringFormOptions(),
  ]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar turma de itinerário</h1>
      <OfferingForm id={id} defaults={row} weekdays={(row.weekdays as number[]) ?? []} teacherIds={links.map((l) => l.id)} {...options} />
    </div>
  );
}
