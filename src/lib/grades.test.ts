import Decimal from "decimal.js";
import { describe, expect, it } from "vitest";
import { bimesterGrade, finalAverage, finalGrade, passed, recoveryScore, roundToHalf } from "./grades";

const d = (v: string) => new Decimal(v);
const s = (kind: string, score: string) => ({ kind, score });

describe("grades (grades/services.py)", () => {
  it("bimester grade sums regular + bonus, caps at 10, ignores recovery", () => {
    expect(bimesterGrade([s("R", "2.5"), s("R", "5.5"), s("B", "1")])?.toFixed(2)).toBe("9.00");
    expect(bimesterGrade([s("R", "3"), s("R", "6"), s("B", "1.5")])?.toFixed(2)).toBe("10.00");
    expect(bimesterGrade([s("R", "4"), s("C", "9")])?.toFixed(2)).toBe("4.00");
    expect(bimesterGrade([s("B", "1")])).toBeNull();
  });
  it("an adjustment replaces the bimester grade, up or down", () => {
    expect(bimesterGrade([s("R", "2"), s("R", "3"), s("B", "1"), s("A", "6.5")])?.toFixed(2)).toBe("6.50");
    expect(bimesterGrade([s("R", "3"), s("R", "6"), s("A", "7")])?.toFixed(2)).toBe("7.00");
    expect(bimesterGrade([s("A", "6")])?.toFixed(2)).toBe("6.00");
    expect(bimesterGrade([s("R", "4"), s("A", "5"), s("A", "6")])?.toFixed(2)).toBe("6.00");
  });
  it("rounds to the half point at .25 and .75", () => {
    expect(roundToHalf(d("7.24")).toFixed(2)).toBe("7.00");
    expect(roundToHalf(d("7.25")).toFixed(2)).toBe("7.50");
    expect(roundToHalf(d("7.74")).toFixed(2)).toBe("7.50");
    expect(roundToHalf(d("7.75")).toFixed(2)).toBe("8.00");
  });
  it("annual average waits for all four bimesters", () => {
    expect(finalAverage([d("6"), d("7"), d("8"), null])).toBeNull();
    // 6*.2 + 7*.3 + 8*.2 + 9*.3 = 7.6 → 7.5
    expect(finalAverage([d("6"), d("7"), d("8"), d("9")])?.toFixed(2)).toBe("7.50");
  });
  it("final recovery averages in only below 6", () => {
    expect(finalGrade(d("5"), d("8"))?.toFixed(2)).toBe("6.50");
    expect(finalGrade(d("7"), d("2"))?.toFixed(2)).toBe("7.00");
    expect(passed(d("5"), null)).toBeNull();
    expect(passed(d("4"), d("7"))).toBe(false); // 5.5
    expect(passed(d("5"), d("7"))).toBe(true); // 6.0
    expect(recoveryScore([s("C", "4"), s("C", "7.5"), s("R", "10")])?.toFixed(2)).toBe("7.50");
  });
});

import { parseScore } from "../app/(app)/grades/score";

describe("score cells (score_field)", () => {
  it("accepts comma decimals up to the exam maximum; blank deletes", () => {
    expect(parseScore("2,5", "3.00")).toEqual({ score: "2.50" });
    expect(parseScore("", "3.00")).toEqual({ score: null });
    expect(parseScore("3,01", "3.00")).toHaveProperty("error");
    expect(parseScore("2,555", "3.00")).toHaveProperty("error");
    expect(parseScore("abc", "3.00")).toHaveProperty("error");
    expect(parseScore("-1", "3.00")).toHaveProperty("error");
  });
});

import { conceptGrade } from "./incidents";

describe("concept grade (incidents/services.py)", () => {
  it("starts at 1, loses penalties and 0.2 per tolerated delay beyond 2, never below 0", () => {
    expect(conceptGrade("0", 0).toFixed(2)).toBe("1.00");
    expect(conceptGrade("0.3", 2).toFixed(2)).toBe("0.70");
    expect(conceptGrade("0.3", 4).toFixed(2)).toBe("0.30");
    expect(conceptGrade("0.8", 5).toFixed(2)).toBe("0.00");
  });
});

import { isoWeekday } from "./dates";
import { lectureDateError, periodError, weekdayPeriods } from "./lessons";

describe("lessons (lessons/models.py)", () => {
  it("Saturday has 7 periods, other days 12", () => {
    expect(weekdayPeriods(6)).toHaveLength(7);
    expect(weekdayPeriods(1)).toHaveLength(12);
    expect(periodError(6, 8)).toBe("O sábado tem só 7 aulas.");
    expect(periodError(5, 12)).toBeNull();
  });
  it("lectures are Monday to Saturday, inside the school year", () => {
    expect(isoWeekday("2026-11-16")).toBe(1);
    expect(isoWeekday("2026-11-15")).toBe(7);
    expect(lectureDateError("2026-11-15", "2026-01-10", "2026-12-15")).toBe("As aulas são de segunda a sábado.");
    expect(lectureDateError("2026-12-19", "2026-01-10", "2026-12-15")).toBe(
      "A data está fora do ano escolar da turma.",
    );
    expect(lectureDateError("2026-11-14", "2026-01-10", "2026-12-15")).toBeNull();
  });
});

import { attendanceRate, extraGrade, isMemberOn, lessonDays, workload } from "./pathways";

describe("pathways (pathways/services.py)", () => {
  it("workload: fixed hours, or 45 min per lesson attended", () => {
    expect(workload("F", "40.00", 0).toFixed(2)).toBe("40.00");
    expect(workload("P", "0", 8).toFixed(2)).toBe("6.00");
    expect(workload("N", "0", 8).toFixed(2)).toBe("0.00");
  });
  it("attendance rate leaves excused absences out", () => {
    expect(attendanceRate(3, 1)?.toFixed(0)).toBe("75");
    expect(attendanceRate(0, 0)).toBeNull();
  });
  it("lesson days fall on the offering's weekdays", () => {
    expect(lessonDays([2, 4], "2026-11-16", "2026-11-22")).toEqual(["2026-11-17", "2026-11-19"]);
  });
  it("extra grade is capped; membership covers joined..left", () => {
    expect(extraGrade("2.5", "2").toFixed(2)).toBe("2.00");
    expect(isMemberOn({ joinedAt: "2026-03-01", leftAt: "2026-05-01" }, "2026-05-01")).toBe(true);
    expect(isMemberOn({ joinedAt: "2026-03-01", leftAt: null }, "2026-02-28")).toBe(false);
  });
});
