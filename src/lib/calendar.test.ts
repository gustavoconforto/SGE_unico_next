import { describe, expect, it } from "vitest";
import { defaultSchoolDay, monthDays, monthName, weekdayName, yearMonths } from "./calendar";

describe("calendar", () => {
  it("lists the months a year touches, across a year boundary", () => {
    expect(yearMonths("2025-11-17", "2026-02-03")).toEqual(["2025-11", "2025-12", "2026-01", "2026-02"]);
    expect(yearMonths("2026-02-02", "2026-02-20")).toEqual(["2026-02"]);
  });

  it("clips the first and last months to the year", () => {
    expect(monthDays("2026-02", "2026-02-25", "2026-12-18")).toEqual([
      "2026-02-25",
      "2026-02-26",
      "2026-02-27",
      "2026-02-28",
    ]);
    expect(monthDays("2026-12", "2026-02-02", "2026-12-02")).toEqual(["2026-12-01", "2026-12-02"]);
    expect(monthDays("2028-02", "2028-01-01", "2028-12-31")).toHaveLength(29);
  });

  it("defaults Monday to Friday to school days", () => {
    expect(defaultSchoolDay("2026-11-27")).toBe(true); // Friday
    expect(defaultSchoolDay("2026-11-28")).toBe(false); // Saturday
    expect(defaultSchoolDay("2026-11-29")).toBe(false); // Sunday
  });

  it("names days and months in Portuguese", () => {
    expect(weekdayName("2026-11-23")).toBe("segunda-feira");
    expect(monthName("2026-03")).toBe("março de 2026");
  });
});
