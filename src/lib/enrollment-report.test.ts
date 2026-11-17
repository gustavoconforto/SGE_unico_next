import { expect, test } from "vitest";
import { SHIFT_PERIODS, fullAddress, longDate, reportGrade } from "./enrollment-report";

test("longDate writes the day without padding and the month in lower case", () => {
  expect(longDate("2026-11-07")).toBe("7 de novembro de 2026");
  expect(longDate("2026-03-15")).toBe("15 de março de 2026");
});

test("reportGrade prefers the class grade level over the contract level", () => {
  expect(reportGrade(2, "1")).toBe("2");
  expect(reportGrade(null, "3")).toBe("3");
  expect(reportGrade(undefined, "1")).toBe("1");
});

test("SHIFT_PERIODS covers the class shifts", () => {
  expect(SHIFT_PERIODS.M).toBe("matutino");
  expect(SHIFT_PERIODS.X).toBeUndefined();
});

test("fullAddress skips blank parts and formats the CEP", () => {
  expect(fullAddress({ address: "SQS 106", neighborhood: "Asa Sul", city: "Brasília", state: "DF", zipCode: "70345000" })).toBe(
    "SQS 106, Asa Sul, Brasília - DF CEP: 70345-000",
  );
  expect(fullAddress({ address: "SQS 106", neighborhood: "", city: "", state: "", zipCode: "" })).toBe("SQS 106");
});
