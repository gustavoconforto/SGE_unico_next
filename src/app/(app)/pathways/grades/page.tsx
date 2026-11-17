import type { Metadata } from "next";
import { Suspense } from "react";
import { param } from "@/lib/list";
import { scoreInput } from "../../grades/score";
import { yearOptions } from "../../classes/options";
import { offeringOptions } from "../data";
import { BIMESTER_OPTIONS, UrlPicker } from "../picker";
import { PathwaySheet } from "./pathway-sheet";
import { loadPathwaySheet } from "./sheet";

export const metadata: Metadata = { title: "Notas de itinerário" };

export default async function PathwayGradesPage({ searchParams }: PageProps<"/pathways/grades">) {
  const sp = await searchParams;
  const years = await yearOptions();
  const yearId = years.find(([id]) => id === Number(param(sp, "school_year")))?.[0] ?? null;
  // Only pathways that give an extra grade
  const offerings = yearId ? await offeringOptions({ schoolYearId: yearId, givesGrade: true }) : [];
  const offeringId = offerings.find((o) => o.id === Number(param(sp, "offering")))?.id ?? null;
  const bimester = [1, 2, 3, 4].find((b) => b === Number(param(sp, "bimester"))) ?? null;
  const sheet = offeringId && bimester ? await loadPathwaySheet(offeringId, bimester) : null;
  const query = new URLSearchParams({ school_year: String(yearId), offering: String(offeringId), bimester: String(bimester) }).toString();
  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold">Notas de itinerário</h1>
        <p className="text-sm text-gray-500">Selecione o ano escolar, a turma de itinerário e o bimestre.</p>
      </div>
      <Suspense>
        <UrlPicker
          fields={[
            { name: "school_year", label: "Ano escolar", empty: "Selecione um ano escolar", options: years, clears: ["offering"] },
            { name: "offering", label: "Turma de itinerário", empty: "Selecione uma turma de itinerário", options: offerings.map((o) => [o.id, o.label] as const) },
            { name: "bimester", label: "Bimestre", empty: "Selecione um bimestre", options: BIMESTER_OPTIONS },
          ]}
        />
      </Suspense>
      {sheet && (
        <PathwaySheet
          key={query}
          selection={{ query, offeringId: offeringId!, bimester: bimester! }}
          maxScore={sheet.maxScore}
          hasDates={sheet.hasDates}
          rows={sheet.rows.map((r) => ({ id: r.id, student: r.student, leftAt: r.leftAt, rate: r.rate?.toFixed(0) ?? null, score: scoreInput(r.saved?.score) }))}
        />
      )}
    </div>
  );
}
