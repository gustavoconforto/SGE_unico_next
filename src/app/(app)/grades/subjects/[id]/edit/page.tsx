import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { gradesSubject as subject } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { departmentOptions } from "../../../options";
import { SubjectForm } from "../../subject-form";

export const metadata: Metadata = { title: "Editar matéria" };

export default async function EditSubjectPage({ params }: PageProps<"/grades/subjects/[id]/edit">) {
  const id = await idParam(params);
  const [[row], departments] = await Promise.all([db.select().from(subject).where(eq(subject.id, id)), departmentOptions()]);
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar matéria</h1>
      <SubjectForm id={id} defaults={row} departments={departments} />
    </div>
  );
}
