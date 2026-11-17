import type { Metadata } from "next";
import { IncidentTypeForm } from "../type-form";

export const metadata: Metadata = { title: "Novo tipo de ocorrência" };

export default function NewIncidentTypePage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo tipo de ocorrência</h1>
      <IncidentTypeForm />
    </div>
  );
}
