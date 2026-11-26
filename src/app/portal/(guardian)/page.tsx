import type { Metadata } from "next";
import Link from "next/link";
import { Panel } from "@/components/panel";
import { today } from "@/lib/finance";
import { lessonWeekday, WEEKDAYS } from "@/lib/lessons";
import { param } from "@/lib/list";
import { PORTAL_HOME } from "@/lib/portal-paths";
import { timetableSlots } from "../../(app)/lessons/data";
import { guardianStudents, requireGuardian } from "../data";

export const metadata: Metadata = { title: "Início" };

export default async function PortalHomePage({ searchParams }: PageProps<"/portal">) {
  const { session, guardianId } = await requireGuardian();
  const [students, sp] = await Promise.all([guardianStudents(guardianId), searchParams]);
  const todayWeekday = lessonWeekday(today());
  const asked = Number(param(sp, "dia"));
  const weekday = WEEKDAYS.some(([d]) => d === asked) ? asked : todayWeekday;
  // Class ids come only from the guardian's own students, never from the URL
  const classIds = [...new Set(students.flatMap((s) => s.classes.map((c) => c.id)))];
  const slotsByClass = new Map(await Promise.all(classIds.map(async (id) => [id, await timetableSlots(id)] as const)));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Olá, {session.user.name.split(" ")[0]}</h1>
      {students.length === 0 ? (
        <p className="text-gray-600">Nenhum aluno vinculado ao seu cadastro. Fale com a secretaria.</p>
      ) : (
        <>
          <nav aria-label="Dia da semana" className="flex gap-1">
            {WEEKDAYS.map(([d, name]) => (
              <Link
                key={d}
                href={d === todayWeekday ? PORTAL_HOME : `${PORTAL_HOME}?dia=${d}`}
                aria-current={d === weekday ? "date" : undefined}
                aria-label={name}
                scroll={false}
                className={`flex min-h-11 flex-1 items-center justify-center rounded-lg border text-sm ${
                  d === weekday
                    ? "border-gray-500 bg-gray-100 font-semibold text-gray-900"
                    : "border-gray-200 bg-white text-gray-700 hover:bg-gray-100"
                }`}
              >
                {name.slice(0, 3)}
              </Link>
            ))}
          </nav>
          {students.map((s) => (
            <Panel key={s.id} title={s.name}>
              {s.classes.length === 0 ? (
                <p className="text-gray-600">Sem turma no momento.</p>
              ) : (
                s.classes.map((c) => {
                  const slots = (slotsByClass.get(c.id) ?? [])
                    .filter((x) => x.weekday === weekday)
                    .sort((a, b) => a.period - b.period);
                  return (
                    <div key={c.id} className="flex flex-col gap-2">
                      <p className="text-gray-600">
                        Turma <span className="font-semibold text-gray-900">{c.label}</span>
                      </p>
                      <h3 className="text-sm font-semibold text-gray-900">
                        Aulas de {WEEKDAYS.find(([d]) => d === weekday)![1].toLowerCase()}
                        {weekday === todayWeekday && " (hoje)"}
                      </h3>
                      {slots.length === 0 ? (
                        <p className="text-gray-600">Sem aulas neste dia.</p>
                      ) : (
                        <ol className="divide-y divide-gray-100">
                          {slots.map((x) => (
                            <li key={x.period} className="flex items-baseline gap-3 py-2">
                              <span className="w-14 shrink-0 text-sm text-gray-500">{x.period}ª aula</span>
                              <span className="min-w-0">
                                <span className="block font-semibold text-gray-900">{x.subject}</span>
                                <span className="block text-sm text-gray-500">{x.teacher}</span>
                              </span>
                            </li>
                          ))}
                        </ol>
                      )}
                    </div>
                  );
                })
              )}
            </Panel>
          ))}
        </>
      )}
    </div>
  );
}
