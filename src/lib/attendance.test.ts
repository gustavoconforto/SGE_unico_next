import { describe, expect, it } from "vitest";
import { attendanceDateError, isAttendanceStatus, nextStatus } from "./attendance";

describe("attendance", () => {
  const year = ["2026-02-02", "2026-12-18"] as const;

  it("cycles a cell through Presente, Falta and Falta justificada", () => {
    expect(nextStatus("P")).toBe("F");
    expect(nextStatus("F")).toBe("J");
    expect(nextStatus("J")).toBe("P");
  });

  it("accepts only the roll call codes", () => {
    expect(["P", "F", "J"].every(isAttendanceStatus)).toBe(true);
    expect(isAttendanceStatus("X")).toBe(false);
    expect(isAttendanceStatus("")).toBe(false);
  });

  it("takes the roll call on a school day of the year, up to today", () => {
    expect(attendanceDateError("2026-11-25", ...year, true, "2026-11-25")).toBeNull();
    expect(attendanceDateError("2026-11-28", ...year, true, "2026-11-30")).toBeNull(); // a Saturday set as letivo
  });

  it("refuses Sundays, days outside the year, future days and days that aren't letivos", () => {
    expect(attendanceDateError("2026-11-29", ...year, true, "2026-11-30")).toBe("As aulas são de segunda a sábado.");
    expect(attendanceDateError("2026-12-21", ...year, true, "2026-12-31")).toBe(
      "A data está fora do ano escolar da turma.",
    );
    expect(attendanceDateError("2026-11-26", ...year, true, "2026-11-25")).toBe(
      "A chamada só pode ser feita até o dia de hoje.",
    );
    expect(attendanceDateError("2026-11-25", ...year, false, "2026-11-25")).toBe("O dia não é letivo no calendário.");
  });
});
