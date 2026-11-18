// PaymentSaveMixin against the dev database (gestao-pg): the principal must fit the balance, an edit counts the
// payment's own principal back in, and saving or deleting refreshes the installment's status.
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import { accountsAccount as account, accountsAccounttype as accountType, accountsInstallment as installment, accountsPayment as payment } from "@/db/schema/app";
import { deletePayment, saveBatchPayment, savePayment } from "./actions";

vi.mock("@/lib/session", () => ({ requireSession: async () => ({ user: { role: "admin" } }) }));
vi.mock("next/navigation", () => ({
  redirect: (url: string) => {
    throw new Error(`REDIRECT ${url}`);
  },
}));

// Writes rows: never against anything but a local database
const local = /@(localhost|127\.0\.0\.1)[:/]/.test(process.env.DATABASE_URL ?? "");

describe.skipIf(!local)("savePayment / deletePayment", () => {
  let categoryId: number;
  let accountId: number;
  let installmentId: number;

  const form = (amount: string) => {
    const f = new FormData();
    for (const [k, v] of Object.entries({ installmentId: String(installmentId), paidAt: "2026-01-10", amount, method: "PIX" })) f.set(k, v);
    return f;
  };
  const save = (id: number | null, amount: string) => savePayment(id, "P", false, {}, form(amount)).catch((e: Error) => e.message);
  const status = async () => (await db.select({ s: installment.status }).from(installment).where(eq(installment.id, installmentId)))[0].s;

  beforeAll(async () => {
    [{ id: categoryId }] = await db.insert(accountType).values({ name: `test-payment-${Date.now()}`, direction: "P" }).returning({ id: accountType.id });
    [{ id: accountId }] = await db
      .insert(account)
      .values({ direction: "P", description: "test payment", categoryId, issueDate: "2026-01-01", grossValue: "100.00", discountValue: "0.00", notes: "" })
      .returning({ id: account.id });
    [{ id: installmentId }] = await db.insert(installment).values({ accountId, number: 1, dueDate: "2026-01-10", amount: "100.00", status: "A" }).returning({ id: installment.id });
  });

  // Everything under the test's own category; skips what setup never made
  afterAll(async () => {
    if (categoryId === undefined) return;
    const accounts = db.select({ id: account.id }).from(account).where(eq(account.categoryId, categoryId));
    const installments = db.select({ id: installment.id }).from(installment).where(inArray(installment.accountId, accounts));
    await db.delete(payment).where(inArray(payment.installmentId, installments));
    await db.delete(installment).where(inArray(installment.accountId, accounts));
    await db.delete(account).where(eq(account.categoryId, categoryId));
    await db.delete(accountType).where(eq(accountType.id, categoryId));
  });

  it("checks the balance, counts an edited payment back in, and refreshes the status", async () => {
    expect(await save(null, "60,00")).toMatch(/^REDIRECT/);
    expect(await status()).toBe("P");

    // 60 paid, 40 left
    expect(await save(null, "50,00")).toMatchObject({ errors: { amount: [expect.stringContaining("saldo é R$ 40,00")] } });

    // Editing the 60 to 100 fits: its own 60 is back in the balance
    const [{ id }] = await db.select({ id: payment.id }).from(payment).where(eq(payment.installmentId, installmentId));
    expect(await save(id, "100,00")).toMatch(/^REDIRECT/);
    expect(await status()).toBe("Q");

    // A paid installment takes no new payment
    expect(await save(null, "1,00")).toMatchObject({ errors: { installmentId: [expect.any(String)] } });

    await expect(deletePayment(id)).rejects.toThrow(/^REDIRECT/);
    expect(await status()).toBe("A");
  });
});

describe.skipIf(!local)("saveBatchPayment", () => {
  let categoryId: number;
  let accountId: number;
  let ids: number[];

  const form = (fields: Record<string, string>) => {
    const f = new FormData();
    f.set("paidAt", "2026-02-10");
    f.set("method", "PIX");
    for (const id of ids) f.append("installment", String(id));
    for (const [k, v] of Object.entries(fields)) f.set(k, v);
    return f;
  };
  const save = (fields: Record<string, string>) => saveBatchPayment({}, form(fields)).catch((e: Error) => e.message);
  const payments = () => db.select().from(payment).where(inArray(payment.installmentId, ids));

  beforeAll(async () => {
    [{ id: categoryId }] = await db.insert(accountType).values({ name: `test-batch-${Date.now()}`, direction: "R" }).returning({ id: accountType.id });
    [{ id: accountId }] = await db
      .insert(account)
      .values({ direction: "R", description: "test batch", categoryId, issueDate: "2026-01-01", grossValue: "300.00", discountValue: "0.00", notes: "" })
      .returning({ id: account.id });
    const rows = await db
      .insert(installment)
      .values([
        { accountId, number: 1, dueDate: "2026-01-10", amount: "100.00", status: "A" },
        { accountId, number: 2, dueDate: "2026-02-10", amount: "200.00", status: "A" },
      ])
      .returning({ id: installment.id });
    ids = rows.map((r) => r.id);
  });

  afterAll(async () => {
    if (categoryId === undefined) return;
    await db.delete(payment).where(inArray(payment.installmentId, ids ?? []));
    await db.delete(installment).where(eq(installment.accountId, accountId));
    await db.delete(account).where(eq(account.categoryId, categoryId));
    await db.delete(accountType).where(eq(accountType.id, categoryId));
  });

  it("refuses a stale balance, then pays every installment in full with its own charges", async () => {
    const [a, b] = ids;
    // The screen showed 90 for the first one: someone paid in between, nothing is saved
    expect(await save({ [`balance_${a}`]: "90.00", [`balance_${b}`]: "200.00" })).toMatchObject({ formError: expect.stringContaining("outra baixa") });
    // A discount that eats the whole amount is refused on its row
    expect(await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00", [`discount_${b}`]: "200,00" })).toMatchObject({ errors: { [`discount_${b}`]: [expect.any(String)] } });
    expect(await payments()).toHaveLength(0);

    const result = await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00", [`penalty_${a}`]: "2,00", [`interest_${a}`]: "0,50", [`discount_${b}`]: "10,00" });
    expect(result).toBe(`REDIRECT /accounts/receivable/${accountId}/edit?msg=payments_created`);
    const saved = Object.fromEntries((await payments()).map((p) => [p.installmentId, p]));
    expect(saved[a]).toMatchObject({ amount: "102.50", penalty: "2.00", interest: "0.50", discount: "0.00", method: "PIX" });
    expect(saved[b]).toMatchObject({ amount: "190.00", discount: "10.00" });
    const statuses = await db.select({ s: installment.status }).from(installment).where(inArray(installment.id, ids));
    expect(statuses.map((r) => r.s)).toEqual(["Q", "Q"]);

    // Paid now: a second submit of the same screen is refused
    expect(await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00" })).toMatchObject({ formError: expect.stringContaining("não aceita") });
  });
});
