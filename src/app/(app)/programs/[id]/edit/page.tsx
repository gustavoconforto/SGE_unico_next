import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import { programsProgram } from "@/db/schema/app";
import { idParam } from "@/lib/list";
import { ProgramForm } from "../../program-form";

export const metadata: Metadata = { title: "Editar curso" };

export default async function EditProgramPage({ params }: PageProps<"/programs/[id]/edit">) {
  const id = await idParam(params);
  const [program] = await db.select().from(programsProgram).where(eq(programsProgram.id, id));
  if (!program) notFound();

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Editar curso</h1>
      <ProgramForm id={id} defaults={program} />
    </div>
  );
}
