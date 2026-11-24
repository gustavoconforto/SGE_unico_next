import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { hasPermission } from "@/lib/authorization";
import { LOCKED, allLocks, gradeEditError, staffOnly } from "@/lib/grade-lock";
import { currentSchoolYear } from "@/lib/concept-db";
import { LAST_SHEET } from "../score";
import { gradeSelection } from "../selection";
import { GradePicker } from "./grade-picker";
import { GradeSheet } from "./grade-sheet";
import { loadSheet } from "./sheet";

export const metadata: Metadata = { title: "Lançamento de notas" };

const SHEET_KEYS = ["school_year", "school_class", "subject", "bimester"];

/** With nothing picked, reopen the last sheet (saved by the sheet in a cookie), else start on the current school year. */
async function startingQuery(): Promise<string | null> {
  // shortcut: the cookie is per browser, not per user; a shared office computer reopens the last person's sheet, harmless since access is checked on load
  let last = new URLSearchParams();
  try {
    last = new URLSearchParams(decodeURIComponent((await cookies()).get(LAST_SHEET)?.value ?? ""));
  } catch {} // a mangled cookie just starts fresh
  const kept = new URLSearchParams(
    SHEET_KEYS.flatMap((k) => (/^\d+$/.test(last.get(k) ?? "") ? [[k, last.get(k)!]] : [])),
  );
  if (kept.has("school_year")) return kept.toString();
  const year = await currentSchoolYear();
  return year ? `school_year=${year.id}` : null;
}

/** "a turma, a matéria e o período": only what is still to pick (the year usually comes preselected). */
function missingChoices(selected: {
  year: number | null;
  klass: number | null;
  subject: number | null;
  period: number | null;
}) {
  const missing = [
    !selected.year && "o ano letivo",
    !selected.klass && "a turma",
    !selected.subject && "a matéria",
    !selected.period && "o período",
  ].filter((m) => !!m);
  return missing.length > 1
    ? `${missing.slice(0, -1).join(", ")} e ${missing.at(-1)}`
    : (missing[0] ?? "outra matéria");
}

export default async function GradeEntryPage({ searchParams }: PageProps<"/grades/entry">) {
  await requirePermission("grades", "edit");
  const sp = await searchParams;
  if (!Object.keys(sp).length) {
    const start = await startingQuery();
    if (start) redirect(`/grades/entry?${start}`);
  }
  const s = await gradeSelection(sp);
  const { klass, subject, period } = s.selected;
  const sheet = klass && subject && period ? await loadSheet(klass, subject, period) : null;
  const [staff, locks] = sheet
    ? await Promise.all([hasPermission("grades", "manage"), allLocks()])
    : [true, new Set<string>()];
  const locked = locks.has(`${subject}:${period}`);
  const query = new URLSearchParams({
    school_year: String(s.selected.year),
    school_class: String(klass),
    subject: String(subject),
    bimester: String(period),
  }).toString();
  return (
    <div className="flex flex-col gap-6">
      <h1 className="text-2xl font-semibold">Lançamento de notas</h1>
      <GradePicker
        basePath="/grades/entry"
        years={s.years}
        classes={s.classes}
        subjects={s.subjects}
        selected={s.selected}
      />
      {sheet ? (
        <GradeSheet
          key={query}
          selection={{ query, classId: klass!, subjectId: subject!, period: period! }}
          recovery={sheet.recovery}
          unaveraged={sheet.unaveraged}
          examTypes={sheet.examTypes.map((t) => ({ ...t, calculated: staffOnly(t) }))}
          readOnly={Object.fromEntries(
            sheet.examTypes.flatMap((t) =>
              gradeEditError(staff, locked, t) ? [[t.id, gradeEditError(staff, locked, t)!]] : [],
            ),
          )}
          notice={
            locked ? { text: staff ? "Bimestre bloqueado para os professores nesta matéria." : LOCKED, staff } : null
          }
          rows={sheet.rows.map((r) => ({
            id: r.id,
            name: r.name,
            average: r.average?.toFixed(2) ?? null,
            saved: Object.fromEntries(Object.entries(r.saved).map(([k, g]) => [k, g.score])),
          }))}
        />
      ) : (
        <p className="text-gray-500">Selecione {missingChoices(s.selected)}.</p>
      )}
    </div>
  );
}
