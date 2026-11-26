import { Badge } from "flowbite-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Panel } from "@/components/panel";
import { allLocks } from "@/lib/grade-lock";
import { BIMESTERS, formatGrade } from "@/lib/grades";
import { idParam } from "@/lib/list";
import { PORTAL_HOME } from "@/lib/portal-paths";
import { loadReportCard, situation } from "../../../../(app)/grades/report";
import { classShortLabel } from "../../../../(app)/enrollments/data";
import { guardianEnrollmentYearStart, requireGuardian } from "../../../data";

export const metadata: Metadata = { title: "Notas" };

// Guardians see a bimester (or the final recovery) only once staff lock it on /grades/locks, in the enrollment's year
export default async function PortalGradesPage({ params }: PageProps<"/portal/notas/[id]">) {
  const { guardianId } = await requireGuardian();
  const id = await idParam(params);
  const yearStart = await guardianEnrollmentYearStart(guardianId, id);
  if (!yearStart) notFound();
  const locks = await allLocks(yearStart);
  const card = await loadReportCard(id, (subjectId, period) => locks.has(`${subjectId}:${period}`));
  if (!card) notFound();
  const { enrollment: e, rows } = card;

  return (
    <div className="flex flex-col gap-4">
      <Link
        href={PORTAL_HOME}
        className="flex min-h-11 w-fit items-center gap-1 text-sm font-medium text-primary-700 hover:underline"
      >
        <span className="material-symbols-outlined text-gray-500" aria-hidden>
          arrow_back
        </span>
        Início
      </Link>
      <div>
        <h1 className="text-2xl font-semibold">Notas de {e.studentName}</h1>
        <p className="text-gray-600">
          {e.className ? `${classShortLabel({ gradeLevel: e.gradeLevel, name: e.className })} · ` : ""}
          {e.schoolYear}
        </p>
      </div>
      <p className="text-sm text-gray-600">As notas de cada bimestre aparecem quando a escola fecha o bimestre.</p>
      {rows.length === 0 ? (
        <p className="text-gray-600">Nenhuma matéria nesta turma.</p>
      ) : (
        rows.map((r) => {
          const s = situation(r);
          const recoveryShown = r.needsRecovery || r.recovery !== null;
          return (
            <Panel key={r.subject.id} title={r.subject.name}>
              <dl className="grid grid-cols-4 gap-2 text-center">
                {BIMESTERS.map((b, i) => (
                  <div key={b} className="rounded-lg bg-gray-50 py-2">
                    <dt className="text-xs text-gray-500">{b}º bim.</dt>
                    <dd className="text-lg font-semibold text-gray-900">{formatGrade(r.bimesters[i])}</dd>
                  </div>
                ))}
              </dl>
              <dl className="flex flex-wrap items-end gap-x-6 gap-y-2">
                <div>
                  <dt className="text-xs text-gray-500">Média</dt>
                  <dd className="font-semibold text-gray-900">{formatGrade(r.average)}</dd>
                </div>
                {recoveryShown && (
                  <div>
                    <dt className="text-xs text-gray-500">Recuperação</dt>
                    <dd className="font-semibold text-gray-900">{formatGrade(r.recovery)}</dd>
                  </div>
                )}
                {recoveryShown && (
                  <div>
                    <dt className="text-xs text-gray-500">Nota final</dt>
                    <dd className="font-semibold text-gray-900">{formatGrade(r.final)}</dd>
                  </div>
                )}
                <Badge color={s.color} className="ml-auto w-fit whitespace-nowrap">
                  {s.text}
                </Badge>
              </dl>
            </Panel>
          );
        })
      )}
    </div>
  );
}
