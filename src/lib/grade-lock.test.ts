import { describe, expect, it } from "vitest";
import { LOCKED, STAFF_ONLY, gradeEditError } from "./grade-lock";

describe("gradeEditError", () => {
  it("lets staff edit anything, locked or staff-only", () => {
    for (const code of ["PS", "C", "EX", "A"]) {
      expect(gradeEditError(true, true, code)).toBeNull();
      expect(gradeEditError(true, false, code)).toBeNull();
    }
  });

  it("lets a teacher edit a regular grade while the bimester is open", () => {
    expect(gradeEditError(false, false, "PS")).toBeNull();
  });

  it("blocks a teacher on a locked bimester", () => {
    expect(gradeEditError(false, true, "PB")).toBe(LOCKED);
  });

  it("never lets a teacher edit concept, extra or adjustment grades", () => {
    for (const code of ["C", "EX", "A"]) expect(gradeEditError(false, false, code)).toBe(STAFF_ONLY);
  });
});
