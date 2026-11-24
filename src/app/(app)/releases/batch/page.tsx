import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Suspense } from "react";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { activeEnrollmentOptions } from "@/app/(app)/enrollments/data";
import { yearOptions } from "@/app/(app)/classes/options";
import { currentSchoolYear } from "@/lib/concept-db";
import { today } from "@/lib/finance";
import { param } from "@/lib/list";
import { reasonOptions } from "../reasons/options";
import { BatchExitForm } from "./batch-form";

export const metadata: Metadata = { title: "Liberação em lote" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

/** Step 1 (in the URL): date, school year and motive. Step 2: check the students and save. */
export default async function BatchExitPage({ searchParams }: PageProps<"/releases/batch">) {
  await requirePermission("releases", "edit");
  const sp = await searchParams;
  if (!Object.keys(sp).length) {
    const year = await currentSchoolYear();
    redirect(`/releases/batch?date=${today()}${year ? `&school_year=${year.id}` : ""}`);
  }
  const [years, reasons] = await Promise.all([yearOptions(), reasonOptions()]);
  // A choice that isn't in its list (deleted, mistyped) counts as not picked
  const date = DATE_RE.test(param(sp, "date")) ? param(sp, "date") : null;
  const yearId = years.find(([id]) => String(id) === param(sp, "school_year"))?.[0] ?? null;
  const reasonId = reasons.find(([id]) => String(id) === param(sp, "reason"))?.[0] ?? null;
  // Re-sorted by the name shown (social name when used), which activeEnrollmentOptions doesn't sort by
  const students =
    date && yearId && reasonId
      ? (await activeEnrollmentOptions(undefined, yearId)).sort(([, a], [, b]) => a.localeCompare(b, "pt-BR"))
      : null;
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Liberação em lote</h1>
      <div className="flex flex-wrap items-end gap-3">
        <Suspense>
          <FilterDate name="date" label="Data" />
          <FilterSelect name="school_year" label="Ano letivo" options={years} allLabel="Selecione" />
          <FilterSelect name="reason" label="Motivo" options={reasons} allLabel="Selecione" />
        </Suspense>
      </div>
      {students ? (
        <BatchExitForm
          key={`${date}:${yearId}:${reasonId}`}
          exitDate={date!}
          schoolYearId={yearId!}
          reasonId={reasonId!}
          students={students}
        />
      ) : (
        <p className="text-sm text-gray-700">
          {reasons.length
            ? "Escolha a data, o ano letivo e o motivo para ver os alunos."
            : "Cadastre um motivo em Liberações › Motivos antes de registrar liberações."}
        </p>
      )}
    </div>
  );
}
