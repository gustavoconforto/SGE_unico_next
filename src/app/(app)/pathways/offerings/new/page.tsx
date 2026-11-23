import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { OfferingForm } from "../offering-form";
import { offeringFormOptions } from "../options";

export const metadata: Metadata = { title: "Nova turma de itinerário" };

export default async function NewOfferingPage() {
  await requirePermission("pathways", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova turma de itinerário</h1>
      <OfferingForm {...await offeringFormOptions()} />
    </div>
  );
}
