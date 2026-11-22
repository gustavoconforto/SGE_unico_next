import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { pathwaysPathwaysession as session } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { offeringOptions } from "../../../data";
import { SessionForm } from "../../session-form";

export const metadata: Metadata = { title: "Editar aula" };

export default async function EditSessionPage({ params }: PageProps<"/pathways/sessions/[id]/edit">) {
  await requirePermission("pathways", "edit");
  const id = await idParam(params);
  const [[row], offerings] = await Promise.all([db.select().from(session).where(eq(session.id, id)), offeringOptions()]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar aula</h1>
      <SessionForm id={id} back={`/pathways/sessions?offering=${row.offeringId}`} defaults={row} offerings={offerings.map((o) => [o.id, o.label])} />
    </div>
  );
}
