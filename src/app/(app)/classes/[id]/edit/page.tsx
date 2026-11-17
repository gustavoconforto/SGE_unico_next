import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { classesClass } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { ClassForm } from "../../class-form";
import { programOptions, yearOptions } from "../../options";

export const metadata: Metadata = { title: "Editar turma" };

export default async function EditClassPage({ params }: PageProps<"/classes/[id]/edit">) {
  const id = await idParam(params);
  const [[row], programs, years] = await Promise.all([db.select().from(classesClass).where(eq(classesClass.id, id)), programOptions(), yearOptions()]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar turma</h1>
      <ClassForm id={id} defaults={row} programs={programs} years={years} />
    </div>
  );
}
