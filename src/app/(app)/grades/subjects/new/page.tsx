import type { Metadata } from "next";
import { departmentOptions } from "../../options";
import { SubjectForm } from "../subject-form";

export const metadata: Metadata = { title: "Nova matéria" };

export default async function NewSubjectPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova matéria</h1>
      <SubjectForm departments={await departmentOptions()} />
    </div>
  );
}
