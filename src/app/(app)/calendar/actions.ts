"use server";

import { eq, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import { db } from "@/db";
import { enrollmentsCalendarday as calendarDay, enrollmentsSchoolyear as schoolYear } from "@/db/schema/app";
import { requirePermission } from "@/lib/authorization";
import { monthDays, NOTE_MAX, yearMonths } from "@/lib/calendar";

/** Saves every day of the month shown (last write wins); the days come from the year, not from the form. */
export async function saveCalendarMonth(yearId: number, month: string, formData: FormData) {
  await requirePermission("academicSetup", "edit");
  const [year] = await db.select().from(schoolYear).where(eq(schoolYear.id, yearId));
  if (!year || !yearMonths(year.begins, year.ends).includes(month)) redirect("/calendar");
  const checked = new Set(formData.getAll("school_day").map(String));
  const rows = monthDays(month, year.begins, year.ends).map((day) => ({
    schoolYearId: yearId,
    day,
    isSchoolDay: checked.has(day),
    note: String(formData.get(`note_${day}`) ?? "")
      .trim()
      .slice(0, NOTE_MAX),
  }));
  await db
    .insert(calendarDay)
    .values(rows)
    .onConflictDoUpdate({
      target: [calendarDay.schoolYearId, calendarDay.day],
      set: {
        isSchoolDay: sql`excluded.is_school_day`,
        note: sql`excluded.note`,
        updatedAt: new Date().toISOString(),
      },
    });
  redirect(`/calendar?school_year=${yearId}&month=${month}&msg=updated`);
}
