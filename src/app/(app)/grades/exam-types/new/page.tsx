import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { ExamTypeForm } from "../exam-type-form";

export const metadata: Metadata = { title: "Novo tipo de avaliação" };

export default async function NewExamTypePage() {
  await requirePermission("academicSetup", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo tipo de avaliação</h1>
      <ExamTypeForm />
    </div>
  );
}
