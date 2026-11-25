import { hasPermission, requirePermission } from "@/lib/authorization";
import { eq } from "drizzle-orm";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import { employeesEmployee as employee, lessonsTimetableslot as slot } from "@/db/schema/app";
import { money } from "@/lib/finance";
import { PERIODS, WEEKDAYS, weekdayPeriods } from "@/lib/lessons";
import { param } from "@/lib/list";
import { ClassDatePicker } from "../class-picker";
import { levelSubjects, seriesClasses } from "../data";

export const metadata: Metadata = { title: "Grade horária" };

export default async function TimetablePage({ searchParams }: PageProps<"/lessons/timetable">) {
  await requirePermission("timetable", "view");
  const [classes, sp, canEdit] = await Promise.all([seriesClasses(), searchParams, hasPermission("timetable", "edit")]);
  const c = classes.find((x) => x.id === Number(param(sp, "school_class"))) ?? null;
  const [subjects, slots] = c
    ? await Promise.all([
        levelSubjects(c.gradeLevel),
        db
          .select({ weekday: slot.weekday, period: slot.period, subjectId: slot.subjectId, teacher: employee.name })
          .from(slot)
          .innerJoin(employee, eq(slot.teacherId, employee.id))
          .where(eq(slot.schoolClassId, c.id)),
      ])
    : [[], []];
  const subjectName = (id: number) => subjects.find((s) => s.id === id)?.name ?? "?";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-semibold">Grade horária</h1>
        {c && canEdit && <LinkButton href={`/lessons/timetable/${c.id}/edit`}>Editar grade</LinkButton>}
      </div>
      <ClassDatePicker classes={classes.map((x) => [x.id, x.label])} classId={c?.id ?? null} />
      {!c ? (
        <p className="text-gray-500">Selecione a turma.</p>
      ) : (
        <>
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Aula</TableHeadCell>
                  {WEEKDAYS.map(([d, l]) => (
                    <TableHeadCell key={d}>{l}</TableHeadCell>
                  ))}
                </TableRow>
              </TableHead>
              <TableBody>
                {PERIODS.map(([period, label]) => (
                  <TableRow key={period}>
                    <TableCell className="whitespace-nowrap">{label}</TableCell>
                    {WEEKDAYS.map(([weekday]) => {
                      if (period > weekdayPeriods(weekday).length)
                        return <TableCell key={weekday} className="bg-gray-100 dark:bg-gray-800" />;
                      const s = slots.find((x) => x.weekday === weekday && x.period === period);
                      return (
                        <TableCell key={weekday} className="text-xs">
                          {s ? (
                            <>
                              <span className="block font-semibold text-gray-900 dark:text-white">
                                {subjectName(s.subjectId)}
                              </span>
                              <span className="text-gray-500">{s.teacher}</span>
                            </>
                          ) : (
                            "—"
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
          <section className="flex flex-col gap-2">
            <h2 className="text-lg font-semibold">Aulas por semana</h2>
            <Table striped>
              <TableHead>
                <TableRow>
                  <TableHeadCell>Matéria</TableHeadCell>
                  <TableHeadCell className="text-right">Agendadas</TableHeadCell>
                  <TableHeadCell className="text-right">Previstas</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {subjects.map((s) => {
                  const scheduled = slots.filter((x) => x.subjectId === s.id).length;
                  // A weekly mean, so a mismatch is only a warning
                  const matches = s.weeklyClasses === null || money(s.weeklyClasses).eq(scheduled);
                  return (
                    <TableRow key={s.id}>
                      <TableCell>{s.name}</TableCell>
                      <TableCell className="text-right">
                        {scheduled}
                        {!matches && (
                          <Badge color="warning" className="ml-2 inline-flex">
                            Diferente do previsto
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        {s.weeklyClasses === null ? "—" : money(s.weeklyClasses).toString().replace(".", ",")}
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </section>
        </>
      )}
    </div>
  );
}
