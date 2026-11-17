import { describe, expect, it } from "vitest";
import { editedCell, shownName } from "./score";

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
