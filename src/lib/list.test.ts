import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { searchTerms, sortParam } from "./list";

describe("sortParam", () => {
  const columns = { due: sql`due_date` };
  it("accepts a known key, ascending or descending", () => {
    expect(sortParam({ sort: "due" }, columns)?.param).toBe("due");
    expect(sortParam({ sort: "-due" }, columns)?.param).toBe("-due");
  });
  it("ignores unknown, inherited or missing keys", () => {
    expect(sortParam({ sort: "amount" }, columns)).toBeNull();
    expect(sortParam({ sort: "constructor" }, columns)).toBeNull();
    expect(sortParam({}, columns)).toBeNull();
  });
});

describe("searchTerms", () => {
  it("drops accents", () => {
    expect(searchTerms("Otávio Conceição")).toEqual(["Otavio Conceicao"]);
  });
  it("adds the digits of a formatted CPF, CNPJ or CEP", () => {
    expect(searchTerms("123.456.789-00")).toEqual(["123.456.789-00", "12345678900"]);
    expect(searchTerms("70000-000")).toEqual(["70000-000", "70000000"]);
  });
  it("keeps plain digits and text with digits as they are", () => {
    expect(searchTerms("2026001")).toEqual(["2026001"]);
    expect(searchTerms("1º ano")).toEqual(["1º ano"]);
  });
});
