import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { DELAY_TYPES } from "@/lib/incidents";
import { BatchRecordForm } from "../../batch-record-form";
import { batchStudents } from "../../records";
import { saveBatchRecords } from "../actions";

export const metadata: Metadata = { title: "Atrasos em lote" };

export default async function BatchRecordPage() {
  await requirePermission("incidents", "edit");
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Atrasos em lote</h1>
      <BatchRecordForm
        action={saveBatchRecords}
        students={await batchStudents()}
        typeName="delayType"
        types={DELAY_TYPES}
        cancelHref="/incidents/delays"
        nouns={["atraso", "atrasos"]}
      />
    </div>
  );
}
