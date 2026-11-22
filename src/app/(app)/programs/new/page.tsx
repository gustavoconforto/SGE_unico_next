import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { ProgramForm } from "../program-form";

export const metadata: Metadata = { title: "Novo curso" };

export default async function NewProgramPage() {
  await requirePermission("programs", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo curso</h1>
      <ProgramForm />
    </div>
  );
}
