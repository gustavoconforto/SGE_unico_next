import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { PathwayForm } from "../pathway-form";

export const metadata: Metadata = { title: "Novo itinerário" };

export default async function NewPathwayPage() {
  await requirePermission("pathways", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo itinerário</h1>
      <PathwayForm />
    </div>
  );
}
