import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { gradesExamtype as examType } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { ExamTypeForm } from "../../exam-type-form";

export const metadata: Metadata = { title: "Editar tipo de avaliação" };

export default async function EditExamTypePage({ params }: PageProps<"/grades/exam-types/[id]/edit">) {
  const id = await idParam(params);
  const [row] = await db.select().from(examType).where(eq(examType.id, id));
  if (!row) notFound();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar tipo de avaliação</h1>
      <ExamTypeForm id={id} defaults={row} />
    </div>
  );
}
