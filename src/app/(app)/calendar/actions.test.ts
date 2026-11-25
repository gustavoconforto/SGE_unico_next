// saveCalendarMonth against the dev database: saves every day of the month inside the year, updates on a second
// save, and ignores a month outside the year. Uses its own school year, removed (with its days) afterwards.
import "dotenv/config";
import { asc, eq } from "drizzle-orm";
import { afterAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { enrollmentsCalendarday as calendarDay, enrollmentsSchoolyear as schoolYear } from "@/db/schema/app";
import { renderToStaticMarkup } from "react-dom/server";
import { saveCalendarMonth } from "./actions";
import CalendarPage from "./page";

vi.mock("@/lib/authorization", () => ({
  requirePermission: async () => ({ user: { role: "admin" } }),
}));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
  useRouter: () => ({ replace: () => {} }),
}));

const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("saveCalendarMonth", async () => {
  const [{ id: yearId }] = local
    ? await db.insert(schoolYear).values({ begins: "1990-02-26", ends: "1990-12-10" }).returning({ id: schoolYear.id })
    : [{ id: 0 }];
  afterAll(async () => {
    if (local) await db.delete(schoolYear).where(eq(schoolYear.id, yearId));
  });

  const save = (month: string, entries: [string, string][]) => {
    const form = new FormData();
    for (const [k, v] of entries) form.append(k, v);
    return saveCalendarMonth(yearId, month, form);
  };
  const days = () =>
    db
      .select({ day: calendarDay.day, isSchoolDay: calendarDay.isSchoolDay, note: calendarDay.note })
      .from(calendarDay)
      .where(eq(calendarDay.schoolYearId, yearId))
      .orderBy(asc(calendarDay.day));

  it("saves the month's days inside the year, then updates them", async () => {
    await expect(
      save("1990-02", [
        ["school_day", "1990-02-26"],
        ["note_1990-02-27", "  Prova de matemática "],
        ["school_day", "1990-02-01"], // outside the year: ignored
      ]),
    ).rejects.toThrow(`REDIRECT /calendar?school_year=${yearId}&month=1990-02&msg=updated`);
    const html = renderToStaticMarkup(
      await CalendarPage({
        searchParams: Promise.resolve({ school_year: String(yearId), month: "1990-02" }),
      } as never),
    );
    expect(html).toContain("Prova de matemática");
    expect(html.match(/name="school_day"/g)).toHaveLength(3);
    expect(html).toContain("segunda-feira");
    expect(html).toMatch(/Dias letivos<\/p><p[^>]*>1<\/p>/); // only the 26th was checked
    expect(await days()).toEqual([
      { day: "1990-02-26", isSchoolDay: true, note: "" },
      { day: "1990-02-27", isSchoolDay: false, note: "Prova de matemática" },
      { day: "1990-02-28", isSchoolDay: false, note: "" },
    ]);

    await expect(save("1990-02", [["school_day", "1990-02-28"]])).rejects.toThrow("REDIRECT");
    expect((await days()).map((d) => [d.isSchoolDay, d.note])).toEqual([
      [false, ""],
      [false, ""],
      [true, ""],
    ]);
  });

  it("rejects a month outside the year", async () => {
    await expect(save("1991-01", [["school_day", "1991-01-02"]])).rejects.toThrow("REDIRECT /calendar");
    expect(await days()).toHaveLength(3);
  });
});
