import type { Metadata } from "next";
import { gradeSelection } from "../selection";
import { GradePicker } from "./grade-picker";
import { GradeSheet } from "./grade-sheet";
import { loadSheet } from "./sheet";

export const metadata: Metadata = { title: "Lançamento de notas" };

export default async function GradeEntryPage({ searchParams }: PageProps<"/grades/entry">) {
  const s = await gradeSelection(await searchParams);
  const { klass, subject, period } = s.selected;
  const sheet = klass && subject && period ? await loadSheet(klass, subject, period) : null;
  const query = new URLSearchParams({ school_year: String(s.selected.year), school_class: String(klass), subject: String(subject), bimester: String(period) }).toString();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Lançamento de notas</h1>
      <GradePicker basePath="/grades/entry" years={s.years} classes={s.classes} subjects={s.subjects} selected={s.selected} />
      {sheet ? (
        <GradeSheet
          key={query}
          selection={{ query, classId: klass!, subjectId: subject!, period: period! }}
          recovery={sheet.recovery}
          examTypes={sheet.examTypes}
          rows={sheet.rows.map((r) => ({
            id: r.id,
            name: r.name,
            average: r.average?.toFixed(2) ?? null,
            result: r.result?.toFixed(2) ?? null,
            saved: Object.fromEntries(Object.entries(r.saved).map(([k, g]) => [k, g.score])),
          }))}
        />
      ) : (
        <p className="text-gray-500">Selecione o ano letivo, a turma, a matéria e o bimestre.</p>
      )}
    </div>
  );
}
