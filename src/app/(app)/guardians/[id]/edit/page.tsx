import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { studentsGuardian } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { guardianOptions } from "../../../students/options";
import { GuardianForm } from "../../guardian-form";

export const metadata: Metadata = { title: "Editar responsável" };

export default async function EditGuardianPage({ params }: PageProps<"/guardians/[id]/edit">) {
  await requirePermission("students", "edit");
  const id = await idParam(params);
  const [[row], others] = await Promise.all([
    db.select().from(studentsGuardian).where(eq(studentsGuardian.id, id)),
    guardianOptions(),
  ]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar responsável — {row.name}</h1>
      <GuardianForm id={id} defaults={row} others={others} />
    </div>
  );
}
