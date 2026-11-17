import { sql } from "drizzle-orm";
import { describe, expect, it } from "vitest";
import { sortParam } from "./list";

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
