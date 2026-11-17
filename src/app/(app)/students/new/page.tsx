import type { Metadata } from "next";
import { guardianOptions } from "../options";
import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function NewStudentPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo aluno</h1>
      <StudentForm guardianOptions={await guardianOptions()} />
    </div>
  );
}
