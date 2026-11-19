import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { SavedNote } from "@/components/saved-note";
import { db } from "@/db";
import { studentsStudent as student } from "@/db/schema/app";
import { param } from "@/lib/list";
import { displayName } from "@/lib/students";
import { guardianOptions } from "../options";
import { StudentForm } from "../student-form";

export const metadata: Metadata = { title: "Novo aluno" };

export default async function NewStudentPage({ searchParams }: PageProps<"/students/new">) {
  // After "Cadastrar e começar outro": name who was saved, and a new key clears the form
  const saved = Number(param(await searchParams, "saved")) || 0;
  const [[last], options] = await Promise.all([
    saved ? db.select().from(student).where(eq(student.id, saved)) : [],
    guardianOptions(),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo aluno</h1>
      <SavedNote text={last && `Cadastro de ${displayName(last)} salvo, matrícula ${last.registration}.`} />
      <StudentForm key={saved} guardianOptions={options} />
    </div>
  );
}
