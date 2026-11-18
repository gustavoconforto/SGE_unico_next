import type { Metadata } from "next";
import { Suspense } from "react";
import { param } from "@/lib/list";
import { enrollmentWorkload } from "@/lib/pathways-db";
import { activeEnrollmentOptions } from "../../enrollments/data";
import { UrlPicker } from "../picker";
import { WorkloadTable } from "./table";

export const metadata: Metadata = { title: "Carga horária do aluno" };

export default async function StudentWorkloadPage({ searchParams }: PageProps<"/pathways/workload">) {
  const sp = await searchParams;
  const enrollments = await activeEnrollmentOptions();
  const enrollmentId = enrollments.find(([id]) => id === Number(param(sp, "enrollment")))?.[0] ?? null;
  const rows = enrollmentId ? await enrollmentWorkload(enrollmentId) : null;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Carga horária do aluno</h1>
      <Suspense>
        <UrlPicker fields={[{ name: "enrollment", label: "Aluno", empty: "Selecione um aluno", options: enrollments }]} />
      </Suspense>
      {rows ? (
        <>
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm text-gray-500">Por presença: 45 minutos por aula assistida.</p>
            <a href={`/pathways/workload/${enrollmentId}/print`} target="_blank" rel="noopener" className="flex items-center gap-1 text-sm text-primary-600 hover:underline">
              <span className="material-symbols-outlined" aria-hidden="true">print</span>Imprimir
            </a>
          </div>
          <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
            <WorkloadTable rows={rows} className="w-full text-sm" cell="px-4 py-2 border-b border-gray-200 dark:border-gray-700" />
          </div>
        </>
      ) : (
        <p className="text-gray-500">Selecione um aluno para ver a carga horária.</p>
      )}
    </div>
  );
}
