import { describe, expect, it } from "vitest";
import { adjustWeekend } from "./dates";
import { amountInWords, formatCpf, formatZipCode, maskCpf, suggestUsername } from "./format";

describe("amountInWords (from accounts/tests.py AmountInWordsTests)", () => {
  it.each([
    ["7530.16", "sete mil quinhentos e trinta reais e dezesseis centavos"],
    ["1", "um real"],
    ["0.01", "um centavo"],
    ["101", "cento e um reais"],
    ["1100", "mil e cem reais"],
    ["2000000", "dois milhões de reais"],
    ["1500000", "um milhão e quinhentos mil reais"],
    ["1234000", "um milhão duzentos e trinta e quatro mil reais"],
    ["21.50", "vinte e um reais e cinquenta centavos"],
  ])("%s", (value, words) => expect(amountInWords(value)).toBe(words));
});

describe("formatters", () => {
  it("formats CPF and CEP", () => {
    expect(formatCpf("12345678901")).toBe("123.456.789-01");
    expect(() => formatCpf("123")).toThrow(TypeError);
    for (const typed of ["00000000030", "000000000-30", "000.000.000-30", " 000.000.000/30 9"]) expect(maskCpf(typed)).toBe("000.000.000-30");
    expect(maskCpf("")).toBe("");
    expect(maskCpf("123")).toBe("123");
    expect(maskCpf("1234")).toBe("123.4");
    expect(maskCpf("1234567")).toBe("123.456.7");
    expect(maskCpf("1234567890")).toBe("123.456.789-0");
    expect(formatZipCode("70000123")).toBe("70000-123");
  });

  it("moves weekend due dates to Monday", () => {
    expect(adjustWeekend("2026-11-14")).toBe("2026-11-16"); // Saturday
    expect(adjustWeekend("2026-11-15")).toBe("2026-11-16"); // Sunday
    expect(adjustWeekend("2026-11-16")).toBe("2026-11-16"); // Monday
    expect(adjustWeekend("2026-11-17")).toBe("2026-11-17");
    expect(adjustWeekend("2026-12-31")).toBe("2026-12-31");
  });
});

import { z } from "zod";
import { decimalField } from "./form";
import { formatDocument } from "./format";

describe("decimalField (Django DecimalField)", () => {
  const f = decimalField({ min: 0 });
  it("normalizes to 2 places", () => {
    expect(f.parse("1000")).toBe("1000.00");
    expect(f.parse("12,5")).toBe("12.50");
    expect(f.parse("0.10")).toBe("0.10");
  });
  it("rejects too many places, digits, out of range and blanks", () => {
    expect(f.safeParse("1.234").success).toBe(false);
    expect(f.safeParse("123456789").success).toBe(false);
    expect(f.safeParse("-1").success).toBe(false);
    expect(f.safeParse("").success).toBe(false);
    expect(f.safeParse("abc").success).toBe(false);
    expect(decimalField({ optional: true }).parse("")).toBeNull();
    expect(z.object({ p: decimalField({ maxDigits: 5, max: 100 }) }).safeParse({ p: "100.01" }).success).toBe(false);
  });
});

it("formats CPF and CNPJ", () => {
  expect(formatDocument("12345678901")).toBe("123.456.789-01");
  expect(formatDocument("12345678000199")).toBe("12.345.678/0001-99");
});

describe("suggestUsername", () => {
  it.each([
    ["Maria da Conceição Silva", "maria.silva"],
    ["  João   Pedro  ", "joao.pedro"],
    ["Ângela", "angela"],
    ["José D'Ávila", "jose.davila"],
    ["", ""],
  ])("%s → %s", (name, expected) => expect(suggestUsername(name)).toBe(expected));
});
