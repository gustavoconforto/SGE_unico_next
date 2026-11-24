// Regression against the dev database (gestao-pg): a payment committed while another submit waits on the
// installment lock must show up in the waiting submit's balance, or a double click pays twice.
import "dotenv/config";
import { eq } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsAccounttype as accountType,
  accountsInstallment as installment,
  accountsPayment as payment,
} from "@/db/schema/app";
import { lockInstallment } from "./finance-db";

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("lockInstallment", () => {
  let categoryId: number;
  let accountId: number;
  let installmentId: number;

  beforeAll(async () => {
    [{ id: categoryId }] = await db
      .insert(accountType)
      .values({ name: `test-lock-${Date.now()}`, direction: "P" })
      .returning({ id: accountType.id });
    [{ id: accountId }] = await db
      .insert(account)
      .values({
        direction: "P",
        description: "test lock",
        categoryId,
        issueDate: "2026-01-01",
        grossValue: "100.00",
        discountValue: "0.00",
        notes: "",
      })
      .returning({ id: account.id });
    [{ id: installmentId }] = await db
      .insert(installment)
      .values({ accountId, number: 1, dueDate: "2026-01-10", amount: "100.00", status: "A" })
      .returning({ id: installment.id });
  });

  afterAll(async () => {
    await db.delete(payment).where(eq(payment.installmentId, installmentId));
    await db.delete(installment).where(eq(installment.accountId, accountId));
    await db.delete(account).where(eq(account.id, accountId));
    await db.delete(accountType).where(eq(accountType.id, categoryId));
  });

  it("a waiting submit sees the payment committed while it waited", async () => {
    let second: Promise<string | undefined> | undefined;
    await db.transaction(async (tx) => {
      await lockInstallment(tx, installmentId);
      // The second submit queues behind this lock
      second = db.transaction(async (tx2) => (await lockInstallment(tx2, installmentId))?.paid);
      await new Promise((r) => setTimeout(r, 200));
      await tx.insert(payment).values({
        installmentId,
        paidAt: "2026-01-10",
        amount: "100.00",
        penalty: "0.00",
        interest: "0.00",
        monetaryAdjust: "0.00",
        discount: "0.00",
        method: "PIX",
        notes: "",
      });
    });
    expect(Number(await second)).toBe(100);
  });
});
