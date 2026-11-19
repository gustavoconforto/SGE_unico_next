import { describe, expect, it } from "vitest";
import { LOCKED, STAFF_ONLY, gradeEditError } from "./grade-lock";

const exam = (code: string, kind = "R") => ({ code, kind });

describe("gradeEditError", () => {
  it("lets staff edit anything, locked or staff-only", () => {
    for (const code of ["PS", "C", "EX", "A"]) {
      expect(gradeEditError(true, true, exam(code))).toBeNull();
      expect(gradeEditError(true, false, exam(code))).toBeNull();
    }
  });

  it("lets a teacher edit a regular grade while the bimester is open", () => {
    expect(gradeEditError(false, false, exam("PS"))).toBeNull();
  });

  it("blocks a teacher on a locked bimester", () => {
    expect(gradeEditError(false, true, exam("PB"))).toBe(LOCKED);
  });

  it("never lets a teacher edit concept, extra or adjustment grades", () => {
    for (const code of ["C", "EX", "A"]) expect(gradeEditError(false, false, exam(code))).toBe(STAFF_ONLY);
  });

  it("treats any adjustment as staff-only, whatever its code", () => {
    expect(gradeEditError(false, false, exam("AJ", "A"))).toBe(STAFF_ONLY);
  });
});
