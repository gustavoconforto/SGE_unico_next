import { requirePermission } from "@/lib/authorization";
import { and, eq, sql } from "drizzle-orm";
import { Button, Checkbox, Label, TextInput } from "flowbite-react";
import type { Metadata } from "next";
import { db } from "@/db";
import { enrollmentsCalendarday as calendarDay, enrollmentsSchoolyear as schoolYear } from "@/db/schema/app";
import { defaultSchoolDay, monthDays, NOTE_MAX, monthName, weekdayName, yearMonths } from "@/lib/calendar";
import { isoWeekday } from "@/lib/dates";
import { param } from "@/lib/list";
import { yearOptions } from "../classes/options";
import { saveCalendarMonth } from "./actions";
import { CalendarPicker } from "./picker";

export const metadata: Metadata = { title: "Calendário escolar" };

export default async function CalendarPage({ searchParams }: PageProps<"/calendar">) {
  await requirePermission("academicSetup", "view");
  const sp = await searchParams;
  const yearParam = param(sp, "school_year");
  const yearId = /^\d+$/.test(yearParam) ? Number(yearParam) : null;
  const [years, [year]] = await Promise.all([
    yearOptions(),
    yearId ? db.select().from(schoolYear).where(eq(schoolYear.id, yearId)) : [],
  ]);
  const months = year ? yearMonths(year.begins, year.ends) : [];
  const month = months.find((m) => m === param(sp, "month")) ?? null;
  const saved = month
    ? await db
        .select()
        .from(calendarDay)
        .where(and(eq(calendarDay.schoolYearId, year.id), eq(sql`to_char(${calendarDay.day}, 'YYYY-MM')`, month)))
    : [];
  const byDay = new Map(saved.map((d) => [d.day, d]));

  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Calendário escolar</h1>
      <CalendarPicker
        years={years}
        months={months.map((m) => [m, monthName(m)])}
        yearId={year?.id ?? null}
        month={month}
      />
      {month && (
        <form action={saveCalendarMonth.bind(null, year.id, month)} className="flex flex-col gap-4">
          <ul className="divide-y divide-gray-200 rounded-lg border border-gray-200 bg-white">
            {monthDays(month, year.begins, year.ends).map((day) => {
              const row = byDay.get(day);
              const weekend = isoWeekday(day) > 5;
              return (
                <li
                  key={day}
                  className={`flex flex-wrap items-center gap-x-4 gap-y-2 px-4 py-2 ${weekend ? "bg-gray-50" : ""}`}
                >
                  <span className="w-8 text-lg font-semibold text-gray-900 tabular-nums">{day.slice(8)}</span>
                  <span className="w-28 text-sm text-gray-600">{weekdayName(day)}</span>
                  <div className="flex items-center gap-2">
                    <Checkbox
                      id={`school_day_${day}`}
                      name="school_day"
                      value={day}
                      defaultChecked={row?.isSchoolDay ?? defaultSchoolDay(day)}
                    />
                    <Label htmlFor={`school_day_${day}`}>
                      Letivo<span className="sr-only"> (dia {day.slice(8)})</span>
                    </Label>
                  </div>
                  <TextInput
                    name={`note_${day}`}
                    sizing="sm"
                    className="min-w-48 flex-1"
                    maxLength={NOTE_MAX}
                    placeholder="Observação (prova, evento, feriado...)"
                    aria-label={`Observação do dia ${day.slice(8)}`}
                    defaultValue={row?.note ?? ""}
                  />
                </li>
              );
            })}
          </ul>
          <div>
            <Button type="submit">Salvar mês</Button>
          </div>
        </form>
      )}
    </div>
  );
}
