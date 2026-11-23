import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { qAndAQanda as qa } from "@/db/schema/app";
import { currentSchoolYear } from "@/lib/concept-db";
import { idParam } from "@/lib/list";
import { activeEnrollmentOptions } from "../../../enrollments/data";
import { subjectOptions } from "../../../grades/options";
import { QandAForm } from "../../q-and-a-form";

export const metadata: Metadata = { title: "Editar plantão" };

export default async function EditQandAPage({ params }: PageProps<"/q-and-a/[id]/edit">) {
  await requirePermission("qAndA", "edit");
  const id = await idParam(params);
  const [[row], year, subjects] = await Promise.all([db.select().from(qa).where(eq(qa.id, id)), currentSchoolYear(), subjectOptions()]);
  if (!row) notFound();
  const enrollments = await activeEnrollmentOptions(row.enrollmentId, year?.id ?? null);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar plantão</h1>
      <QandAForm id={id} defaults={row} enrollments={enrollments} subjects={subjects.map((s) => [s.id, s.name])} />
    </div>
  );
}
