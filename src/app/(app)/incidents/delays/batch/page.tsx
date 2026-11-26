import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { BatchRecordForm } from "./batch-form";

export const metadata: Metadata = { title: "Atrasos em lote" };

export default async function BatchRecordPage() {
  await requirePermission("incidents", "edit");
  // Re-sorted by the name shown (social name when used), which activeEnrollmentOptions doesn't sort by
  const students = (await activeEnrollmentOptions()).sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"));
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Atrasos em lote</h1>
      <BatchRecordForm students={students} />
    </div>
  );
}
