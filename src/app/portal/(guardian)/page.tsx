import type { Metadata } from "next";
import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { Panel } from "@/components/panel";
import { currentSchoolYear } from "@/lib/concept-db";
import { formatDate, today } from "@/lib/finance";
import { lessonWeekday, WEEKDAYS } from "@/lib/lessons";
import { param } from "@/lib/list";
import { PORTAL_HOME } from "@/lib/portal-paths";
import { pushEnabled } from "@/lib/push";
import { timetableSlots } from "../../(app)/lessons/data";
import { guardianAlerts, guardianStudents, requireGuardian } from "../data";
import { PushPrompt } from "./push-prompt";

export const metadata: Metadata = { title: "Início" };

export default async function PortalHomePage({ searchParams }: PageProps<"/portal">) {
  const { session, guardianId } = await requireGuardian();
  const [linked, sp, year] = await Promise.all([guardianStudents(guardianId), searchParams, currentSchoolYear()]);
  const students = linked.map((s) => ({ ...s, classes: s.classes.filter((c) => c.yearId === year?.id) }));
  const todayWeekday = lessonWeekday(today());
  const asked = Number(param(sp, "dia"));
  const weekday = WEEKDAYS.some(([d]) => d === asked) ? asked : todayWeekday;
  const classIds = (list: typeof linked) => [...new Set(list.flatMap((s) => s.classes.map((c) => c.id)))];
  const [slotsByClass, alerts] = await Promise.all([
    Promise.all(classIds(students).map(async (id) => [id, await timetableSlots(id)] as const)).then((e) => new Map(e)),
    guardianAlerts(classIds(linked)),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Olá, {session.user.name.split(" ")[0]}</h1>
      {pushEnabled && (
        <Panel title="Notificações">
          <PushPrompt publicKey={process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!} />
        </Panel>
      )}
      {alerts.length > 0 && (
        <Panel title="Avisos da escola">
          <ul className="divide-y divide-gray-100">
            {alerts.map((a) => (
              <li key={a.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                <span className="text-sm text-gray-500">{formatDate(today(new Date(a.createdAt)))}</span>
                <span className="font-semibold text-gray-900">{a.title}</span>
                <p className="max-w-prose whitespace-pre-line text-gray-700">{a.body}</p>
              </li>
            ))}
          </ul>
        </Panel>
      )}
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
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <p className="text-gray-600">
                          Turma <span className="font-semibold text-gray-900">{c.label}</span>
                        </p>
                        <LinkButton href={`${PORTAL_HOME}/notas/${c.enrollmentId}`} color="alternative" size="sm">
                          Ver notas
                        </LinkButton>
                      </div>
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
