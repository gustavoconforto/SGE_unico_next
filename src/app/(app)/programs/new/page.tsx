import type { Metadata } from "next";
import { ProgramForm } from "../program-form";

export const metadata: Metadata = { title: "Novo curso" };

export default function NewProgramPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo curso</h1>
      <ProgramForm />
    </div>
  );
}
