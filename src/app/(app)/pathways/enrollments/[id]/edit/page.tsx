import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pathwaysPathwayenrollment as member } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { memberFormOptions } from "../../form-options";
import { MemberForm } from "../../member-form";

export const metadata: Metadata = { title: "Editar inscrição" };

export default async function EditMemberPage({ params }: PageProps<"/pathways/enrollments/[id]/edit">) {
  await requirePermission("pathways", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(member).where(eq(member.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar inscrição em itinerário</h1>
      <MemberForm id={id} back={`/pathways/enrollments?offering=${row.offeringId}`} defaults={row} {...await memberFormOptions(row.offeringId, row.enrollmentId)} />
    </div>
  );
}
