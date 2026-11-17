// Regression: correlated subqueries must reference the outer row as "table"."column".
// A bare "id" binds to the subquery's own table and silently counts the wrong rows.
import { eq } from "drizzle-orm";
import { drizzle } from "drizzle-orm/postgres-js";
import { describe, expect, it } from "vitest";
import { accountsAccount as account, accountsInstallment as installment } from "../db/schema/app";
import { accountSummary, outstandingSql, paidPrincipalSql } from "./finance-db";

const db = drizzle.mock();

describe("correlated subqueries in single-table selects", () => {
  it("accountSummary points at accounts_account.id", () => {
    const { sql } = db.select(accountSummary("2026-11-16")).from(account).where(eq(account.direction, "R")).toSQL();
    expect(sql).toContain('i.account_id = "accounts_account"."id"');
    expect(sql).not.toMatch(/account_id = "id"/);
  });

  it("paid principal and balance point at accounts_installment", () => {
    const { sql } = db.select({ paid: paidPrincipalSql, outstanding: outstandingSql }).from(installment).toSQL();
    expect(sql).toContain('p.installment_id = "accounts_installment"."id"');
    expect(sql).toContain('"accounts_installment"."amount"');
    expect(sql).not.toMatch(/installment_id = "id"/);
  });
});
