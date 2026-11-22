import { requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { enrollmentsSchoolyear } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { SchoolYearForm } from "../../school-year-form";

export const metadata: Metadata = { title: "Editar ano escolar" };

export default async function EditSchoolYearPage({ params }: PageProps<"/enrollments/school-years/[id]/edit">) {
  await requirePermission("enrollmentSetup", "edit");
  const id = await idParam(params);
  const [row] = await db.select().from(enrollmentsSchoolyear).where(eq(enrollmentsSchoolyear.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar ano escolar</h1>
      <SchoolYearForm id={id} defaults={row} />
    </div>
  );
}
