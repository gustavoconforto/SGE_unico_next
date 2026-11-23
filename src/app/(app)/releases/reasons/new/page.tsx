import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { ReasonForm } from "../reason-form";

export const metadata: Metadata = { title: "Novo motivo" };

export default async function NewReasonPage() {
  await requirePermission("releases", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo motivo</h1>
      <ReasonForm />
    </div>
  );
}
