import type { Metadata } from "next";
import { GuardianForm } from "../guardian-form";

export const metadata: Metadata = { title: "Novo responsável" };

export default function NewGuardianPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo responsável</h1>
      <GuardianForm />
    </div>
  );
}
