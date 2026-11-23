import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { ClassForm } from "../class-form";
import { programOptions, yearOptions } from "../options";

export const metadata: Metadata = { title: "Nova turma" };

export default async function NewClassPage() {
  await requirePermission("academicSetup", "edit");
  const [programs, years] = await Promise.all([programOptions(), yearOptions()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova turma</h1>
      <ClassForm programs={programs} years={years} />
    </div>
  );
}
