import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { enrollmentsEnrollmenttype as enrollmentType } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { programOptions, yearOptions } from "../../../../classes/options";
import { EnrollmentTypeForm } from "../../enrollment-type-form";

export const metadata: Metadata = { title: "Editar contrato" };

export default async function EditEnrollmentTypePage({ params }: PageProps<"/enrollments/types/[id]/edit">) {
  const id = await idParam(params);
  const [[row], programs, years] = await Promise.all([db.select().from(enrollmentType).where(eq(enrollmentType.id, id)), programOptions(), yearOptions()]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar contrato</h1>
      <EnrollmentTypeForm id={id} defaults={row} programs={programs} years={years} />
    </div>
  );
}
