import { describe, expect, it } from "vitest";
import { BATHROOM_PERIODS, bathroomCells } from "./incidents";

describe("bathroomCells", () => {
  it("parses checked cells", () => {
    expect(bathroomCells(["12:1", "12:7", "3:4"])).toEqual([
      { enrollmentId: 12, classPeriod: 1 },
      { enrollmentId: 12, classPeriod: 7 },
      { enrollmentId: 3, classPeriod: 4 },
    ]);
  });

  it("accepts no cells", () => {
    expect(bathroomCells([])).toEqual([]);
  });

  it.each(["12:0", `12:${BATHROOM_PERIODS + 1}`, "0:1", "12", "a:1", "12:1:2", "-1:1"])("rejects %s", (cell) => {
    expect(bathroomCells(["5:2", cell])).toBeNull();
  });
});
