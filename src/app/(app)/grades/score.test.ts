import { describe, expect, it } from "vitest";
import Decimal from "decimal.js";
import { editedCell, rowResult, sameScore, shownName } from "./score";

describe("editedCell", () => {
  const name = "score_1_2";
  it("skips a cell left as loaded, so a stale blank never deletes another user's grade", () => {
    expect(editedCell({ [name]: "", [shownName(name)]: "" }, name)).toBeNull();
    expect(editedCell({ [name]: " 7,50", [shownName(name)]: "7,50" }, name)).toBeNull();
  });
  it("skips a cell that wasn't on the user's page (a student added after it loaded)", () => {
    expect(editedCell({}, name)).toBeNull();
  });
  it("returns what the user changed, including a cleared cell", () => {
    expect(editedCell({ [name]: "8", [shownName(name)]: "7,50" }, name)).toBe("8");
    expect(editedCell({ [name]: "", [shownName(name)]: "7,50" }, name)).toBe("");
  });
});

describe("sameScore", () => {
  it("ignores how a score was typed", () => {
    expect(sameScore("7", "7,00")).toBe(true);
    expect(sameScore(" 7,5", "7,50")).toBe(true);
    expect(sameScore("", "")).toBe(true);
  });
  it("tells different or invalid entries apart", () => {
    expect(sameScore("7", "7,50")).toBe(false);
    expect(sameScore("", "7,00")).toBe(false);
    expect(sameScore("abc", "7,00")).toBe(false);
  });
});

describe("rowResult", () => {
  const cell = (kind: string, raw: string, maxScore = "10", calculated = false) => ({ kind, raw, maxScore, calculated });
  it("matches bimesterGrade: regular plus bonus, capped at 10", () => {
    expect(rowResult([cell("R", "3"), cell("R", "4,5"), cell("B", "")], false, null)).toEqual({ result: new Decimal("7.5"), invalid: false, incomplete: false, atRisk: false });
    expect(rowResult([cell("R", "9"), cell("B", "2")], false, null).result?.toFixed(2)).toBe("10.00");
  });
  it("is incomplete while a typed regular score is blank, never for a bonus or a calculated score", () => {
    expect(rowResult([cell("R", "5"), cell("R", "")], false, null).incomplete).toBe(true);
    expect(rowResult([cell("R", "5"), cell("B", "")], false, null).incomplete).toBe(false);
    expect(rowResult([cell("R", "5"), cell("R", "", "1", true)], false, null).incomplete).toBe(false);
    expect(rowResult([cell("R", "", "3")], false, null).result).toBeNull();
  });
  it("puts a partial row at risk only when full marks in the blanks can't reach passing", () => {
    // 2 of 3 typed, the 6-point exam still blank: can reach 8, not at risk
    expect(rowResult([cell("R", "2", "3"), cell("R", "", "6")], false, null)).toMatchObject({ incomplete: true, atRisk: false });
    // 0,5 + at most 1 + 1 = 2,5: can't pass any more
    expect(rowResult([cell("R", "0,5", "3"), cell("R", "", "1"), cell("R", "", "1", true)], false, null).atRisk).toBe(true);
    // complete and below 6, even if a staff-only score or a bonus could still lift it
    expect(rowResult([cell("R", "2", "3"), cell("R", "1", "6"), cell("R", "", "1", true), cell("B", "", "5")], false, null)).toMatchObject({ incomplete: false, atRisk: true });
    // complete and below 6
    expect(rowResult([cell("R", "2", "3"), cell("R", "3", "6")], false, null)).toMatchObject({ incomplete: false, atRisk: true });
  });
  it("gives no result while a cell is invalid", () => {
    expect(rowResult([cell("R", "11"), cell("R", "5")], false, null)).toEqual({ result: null, invalid: true, incomplete: false, atRisk: false });
    expect(rowResult([cell("R", "abc")], false, null).invalid).toBe(true);
  });
  it("in the final recovery, averages the annual grade with the best recovery score", () => {
    expect(rowResult([cell("C", "8")], true, "4.00")).toMatchObject({ atRisk: false });
    expect(rowResult([cell("C", "8")], true, "4.00").result?.toFixed(2)).toBe("6.00");
    expect(rowResult([cell("C", "")], true, "4.00")).toMatchObject({ incomplete: true, atRisk: false });
    expect(rowResult([cell("C", "")], true, "1.00").atRisk).toBe(true);
  });
});
