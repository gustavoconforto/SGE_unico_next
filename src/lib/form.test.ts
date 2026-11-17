import { describe, expect, it } from "vitest";
import { decimalField, parseMoney } from "./form";

describe("decimalField (pt-BR input)", () => {
  const field = decimalField();
  it.each([
    ["4800", "4800.00"],
    ["4800,5", "4800.50"],
    ["4.800,50", "4800.50"],
    ["1.234.567,89", "1234567.89"],
    ["4800.50", "4800.50"],
    ["1.5", "1.50"],
  ])("%s → %s", (input, stored) => {
    expect(field.parse(input)).toBe(stored);
  });
  it("rejects a malformed or ambiguous number", () => {
    expect(field.safeParse("4,800,50").success).toBe(false);
    // 4800 or 4,8? Money doesn't guess
    expect(field.safeParse("4.800").error?.issues[0].message).toMatch(/vírgula/);
  });
});

describe("parseMoney", () => {
  it("reads pt-BR amounts and refuses ambiguous ones", () => {
    expect(parseMoney("1.234,56")?.toFixed(2)).toBe("1234.56");
    expect(parseMoney("")?.toFixed(2)).toBe("0.00");
    expect(parseMoney("4.800")).toBeNull();
    expect(parseMoney("abc")).toBeNull();
  });
});
