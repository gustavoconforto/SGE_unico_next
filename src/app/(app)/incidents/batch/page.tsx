import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { incidentTypeOptions } from "@/app/(app)/incidents/types/options";
import { BatchRecordForm } from "../batch-record-form";
import { batchStudents } from "../records";
import { saveBatchRecords } from "../actions";

export const metadata: Metadata = { title: "Ocorrências em lote" };

export default async function BatchRecordPage() {
  await requirePermission("incidents", "edit");
  const [students, types] = await Promise.all([batchStudents(), incidentTypeOptions()]);
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Ocorrências em lote</h1>
      <BatchRecordForm
        action={saveBatchRecords}
        students={students}
        typeName="incidentTypeId"
        types={types}
        cancelHref="/incidents"
        nouns={["ocorrência", "ocorrências"]}
      />
    </div>
  );
}
