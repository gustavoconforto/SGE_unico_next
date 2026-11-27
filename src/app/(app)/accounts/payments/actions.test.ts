// PaymentSaveMixin against the dev database (gestao-pg): the principal must fit the balance, an edit counts the
// payment's own principal back in, and saving or deleting refreshes the installment's status.
import "dotenv/config";
import { eq, inArray } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsAccounttype as accountType,
  accountsInstallment as installment,
  accountsPayment as payment,
} from "@/db/schema/app";
import { deletePayment, saveBatchPayment, savePayment } from "./actions";

// `book`: holds payments.view; every other permission is granted
const access = vi.hoisted(() => ({ book: true }));
vi.mock("@/lib/authorization", () => ({
  hasPermission: async (resource: string, action: string) => `${resource}.${action}` !== "payments.view" || access.book,
  requirePermission: async (resource: string, action: string) => {
    const code = `${resource}.${action}`;
    if (code === "payments.view" && !access.book) throw new Error("REDIRECT /forbidden");
    return { user: {} };
  },
}));
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
    for (const [k, v] of Object.entries({
      installmentId: String(installmentId),
      paidAt: "2026-01-10",
      amount,
      method: "PIX",
    }))
      f.set(k, v);
    return f;
  };
  const save = (id: number | null, amount: string) =>
    savePayment(id, "P", null, {}, form(amount)).catch((e: Error) => e.message);
  const status = async () =>
    (await db.select({ s: installment.status }).from(installment).where(eq(installment.id, installmentId)))[0].s;

  beforeAll(async () => {
    [{ id: categoryId }] = await db
      .insert(accountType)
      .values({ name: `test-payment-${Date.now()}`, direction: "P" })
      .returning({ id: accountType.id });
    [{ id: accountId }] = await db
      .insert(account)
      .values({
        direction: "P",
        description: "test payment",
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

  // Everything under the test's own category; skips what setup never made
  afterAll(async () => {
    if (categoryId === undefined) return;
    const accounts = db.select({ id: account.id }).from(account).where(eq(account.categoryId, categoryId));
    const installments = db
      .select({ id: installment.id })
      .from(installment)
      .where(inArray(installment.accountId, accounts));
    await db.delete(payment).where(inArray(payment.installmentId, installments));
    await db.delete(installment).where(inArray(installment.accountId, accounts));
    await db.delete(account).where(eq(account.categoryId, categoryId));
    await db.delete(accountType).where(eq(accountType.id, categoryId));
  });

  it("checks the balance, counts an edited payment back in, and refreshes the status", async () => {
    expect(await save(null, "60,00")).toMatch(/^REDIRECT/);
    expect(await status()).toBe("P");

    // 60 paid, 40 left
    expect(await save(null, "50,00")).toMatchObject({
      errors: { amount: [expect.stringContaining("saldo é R$ 40,00")] },
    });

    // Editing the 60 to 100 fits: its own 60 is back in the balance
    const [{ id }] = await db.select({ id: payment.id }).from(payment).where(eq(payment.installmentId, installmentId));
    expect(await save(id, "100,00")).toMatch(/^REDIRECT/);
    expect(await status()).toBe("Q");

    // A paid installment takes no new payment
    expect(await save(null, "1,00")).toMatchObject({ errors: { installmentId: [expect.any(String)] } });

    await expect(deletePayment(id)).rejects.toThrow(/^REDIRECT/);
    expect(await status()).toBe("A");
  });

  it("asks receivables paid by cheque for its details, keeps old cheque payments editable, skips payables", async () => {
    // A receivable under the test's category, so afterAll cleans it up
    const [{ id: receivable }] = await db
      .insert(account)
      .values({
        direction: "R",
        description: "test cheque",
        categoryId,
        issueDate: "2026-01-01",
        grossValue: "100.00",
        discountValue: "0.00",
        notes: "",
      })
      .returning({ id: account.id });
    const [{ id: target }] = await db
      .insert(installment)
      .values({ accountId: receivable, number: 1, dueDate: "2026-01-10", amount: "100.00", status: "A" })
      .returning({ id: installment.id });
    const f = form("10,00");
    f.set("installmentId", String(target));
    f.set("method", "CHQ");
    const saveR = (id: number | null) => savePayment(id, "R", null, {}, f).catch((e: Error) => e.message);
    const row = async (id: number) => (await db.select().from(payment).where(eq(payment.id, id)))[0];

    expect(await saveR(null)).toMatchObject({
      errors: { checkNumber: [expect.any(String)], checkHolderCpf: [expect.any(String)] },
    });
    // A CMC-7 line whose check digits don't match
    f.set("checkNumber", "18776221 6209755155 974742302660");
    expect(await saveR(null)).toMatchObject({ errors: { checkNumber: [expect.stringContaining("não confere")] } });
    for (const [k, v] of Object.entries({
      checkNumber: "000123",
      checkBank: "001",
      checkBranch: "1234",
      checkAccount: "56789-0",
      checkDate: "2026-02-10",
      checkHolderName: "Fulano",
      checkHolderCpf: "123.456.789-00",
    }))
      f.set(k, v);
    expect(await saveR(null)).toMatch(/^REDIRECT/);
    const [{ id }] = await db.select({ id: payment.id }).from(payment).where(eq(payment.installmentId, target));
    expect(await row(id)).toMatchObject({
      checkNumber: "000123",
      checkBank: "001",
      checkDate: "2026-02-10",
      checkHolderCpf: "12345678900",
    });

    // Once filled, an edit can't blank them
    for (const k of [
      "checkNumber",
      "checkBank",
      "checkBranch",
      "checkAccount",
      "checkDate",
      "checkHolderName",
      "checkHolderCpf",
    ])
      f.set(k, "");
    expect(await saveR(id)).toMatchObject({ errors: { checkNumber: [expect.any(String)] } });

    // A cheque payment saved without details (Django, or before this screen) stays editable with them blank
    await db.update(payment).set({ checkNumber: "", checkHolderCpf: "" }).where(eq(payment.id, id));
    f.set("notes", "corrigido");
    expect(await saveR(id)).toMatch(/^REDIRECT/);

    // Switching to PIX drops them
    await db.update(payment).set({ checkNumber: "000123" }).where(eq(payment.id, id));
    f.set("method", "PIX");
    expect(await saveR(id)).toMatch(/^REDIRECT/);
    expect(await row(id)).toMatchObject({ checkNumber: "", checkDate: null, checkHolderCpf: "" });

    // ...and a PIX payment switched to cheque must bring the details: the exception is only for old cheques
    f.set("method", "CHQ");
    expect(await saveR(id)).toMatchObject({ errors: { checkNumber: [expect.any(String)] } });
    await deletePayment(id).catch(() => {});

    // A payable paid by cheque is the school's own cheque: nothing asked, nothing stored
    const p = form("10,00");
    p.set("method", "CHQ");
    expect(await savePayment(null, "P", null, {}, p).catch((e: Error) => e.message)).toMatch(/^REDIRECT/);
    const [payable] = await db.select().from(payment).where(eq(payment.installmentId, installmentId));
    expect(payable).toMatchObject({ method: "CHQ", checkNumber: "" });
    await deletePayment(payable.id).catch(() => {});
  });

  it("asks receivables paid by card for brand, receipt and (credit only) installments, skips payables", async () => {
    const [{ id: receivable }] = await db
      .insert(account)
      .values({
        direction: "R",
        description: "test card",
        categoryId,
        issueDate: "2026-01-01",
        grossValue: "100.00",
        discountValue: "0.00",
        notes: "",
      })
      .returning({ id: account.id });
    const [{ id: target }] = await db
      .insert(installment)
      .values({ accountId: receivable, number: 1, dueDate: "2026-01-10", amount: "100.00", status: "A" })
      .returning({ id: installment.id });
    const f = form("10,00");
    f.set("installmentId", String(target));
    f.set("method", "CRE");
    const saveR = (id: number | null) => savePayment(id, "R", null, {}, f).catch((e: Error) => e.message);
    const row = async (id: number) => (await db.select().from(payment).where(eq(payment.id, id)))[0];

    expect(await saveR(null)).toMatchObject({
      errors: {
        cardBrand: [expect.any(String)],
        cardReceipt: [expect.any(String)],
        cardInstallments: [expect.any(String)],
      },
    });
    f.set("cardBrand", "XYZ");
    f.set("cardReceipt", "123456");
    f.set("cardInstallments", "13");
    expect(await saveR(null)).toMatchObject({
      errors: { cardBrand: [expect.any(String)], cardInstallments: [expect.any(String)] },
    });
    f.set("cardBrand", "ELO");
    f.set("cardInstallments", "3");
    expect(await saveR(null)).toMatch(/^REDIRECT/);
    const [{ id }] = await db.select({ id: payment.id }).from(payment).where(eq(payment.installmentId, target));
    expect(await row(id)).toMatchObject({ cardBrand: "ELO", cardReceipt: "123456", cardInstallments: 3 });

    // Debit is charged at once: whatever was sent, it is 1x
    f.set("method", "DEB");
    expect(await saveR(id)).toMatch(/^REDIRECT/);
    expect(await row(id)).toMatchObject({ method: "DEB", cardInstallments: 1 });

    // A card payment saved without details (Django, or before this screen) stays editable with them blank
    await db.update(payment).set({ cardBrand: "", cardReceipt: "", cardInstallments: null }).where(eq(payment.id, id));
    for (const k of ["cardBrand", "cardReceipt", "cardInstallments"]) f.delete(k);
    expect(await saveR(id)).toMatch(/^REDIRECT/);
    // ...but switching to credit asks for them
    f.set("method", "CRE");
    expect(await saveR(id)).toMatchObject({ errors: { cardBrand: [expect.any(String)] } });

    // Switching to PIX drops them
    await db.update(payment).set({ cardBrand: "VIS", cardReceipt: "9", cardInstallments: 2 }).where(eq(payment.id, id));
    f.set("method", "PIX");
    expect(await saveR(id)).toMatch(/^REDIRECT/);
    expect(await row(id)).toMatchObject({ cardBrand: "", cardReceipt: "", cardInstallments: null });
    await deletePayment(id).catch(() => {});

    // A payable paid by card is the school's own card: nothing asked, nothing stored
    const p = form("10,00");
    p.set("method", "CRE");
    expect(await savePayment(null, "P", null, {}, p).catch((e: Error) => e.message)).toMatch(/^REDIRECT/);
    const [payable] = await db.select().from(payment).where(eq(payment.installmentId, installmentId));
    expect(payable).toMatchObject({ method: "CRE", cardBrand: "", cardInstallments: null });
    await deletePayment(payable.id).catch(() => {});
  });

  it("splits a new payment across methods: one row each, charges on the first, all or nothing", async () => {
    const rows = () => db.select().from(payment).where(eq(payment.installmentId, installmentId));
    // Valor pago is the first method's share; the other methods add to it
    const split = (first: string, fields: Record<string, string>) => {
      const f = form(first);
      f.set("penalty", "2,00");
      f.append("split", "1");
      f.append("split", "2");
      for (const [k, v] of Object.entries(fields)) f.set(k, v);
      return savePayment(null, "P", null, {}, f).catch((e: Error) => e.message);
    };
    // A part with no method: nothing saved
    expect(
      await split("52,00", { splitAmount_1: "30,00", splitMethod_2: "DIN", splitAmount_2: "20,00" }),
    ).toMatchObject({ errors: { splitMethod_1: [expect.any(String)] } });
    // The first method's 2,00 is all multa
    expect(
      await split("2,00", {
        splitMethod_1: "DIN",
        splitAmount_1: "60,00",
        splitMethod_2: "CRE",
        splitAmount_2: "40,00",
      }),
    ).toMatchObject({ errors: { amount: [expect.any(String)] } });
    // 50 + 30 + 30 settles 110 of a 100 balance: the sum is what's checked
    expect(
      await split("52,00", {
        splitMethod_1: "DIN",
        splitAmount_1: "30,00",
        splitMethod_2: "CRE",
        splitAmount_2: "30,00",
      }),
    ).toMatchObject({ errors: { amount: [expect.stringContaining("quitaria R$ 110,00")] } });
    expect(await rows()).toHaveLength(0);

    expect(
      await split("52,00", {
        splitMethod_1: "DIN",
        splitAmount_1: "30,00",
        splitMethod_2: "CRE",
        splitAmount_2: "20,00",
      }),
    ).toMatch(/^REDIRECT/);
    const saved = (await rows()).sort((a, b) => a.id - b.id);
    expect(saved.map((r) => [r.method, r.amount, r.penalty])).toEqual([
      ["PIX", "52.00", "2.00"],
      ["DIN", "30.00", "0.00"],
      ["CRE", "20.00", "0.00"],
    ]);
    expect(await status()).toBe("Q");
    await db.delete(payment).where(eq(payment.installmentId, installmentId));
    await db.update(installment).set({ status: "A" }).where(eq(installment.id, installmentId));
  });

  it("without payments.view, only takes new payments of enrollment installments", async () => {
    expect(await save(null, "10,00")).toMatch(/^REDIRECT/);
    const [{ id }] = await db.select({ id: payment.id }).from(payment).where(eq(payment.installmentId, installmentId));
    access.book = false;
    try {
      // This account has no enrollment: a typed-in installment id is refused, balance not revealed
      expect(await save(null, "10,00")).toMatchObject({ errors: { installmentId: [expect.any(String)] } });
      expect(await save(id, "20,00")).toBe("REDIRECT /forbidden");
      await expect(deletePayment(id)).rejects.toThrow("REDIRECT /forbidden");
    } finally {
      access.book = true;
    }
    expect(
      await db.select({ amount: payment.amount }).from(payment).where(eq(payment.installmentId, installmentId)),
    ).toEqual([{ amount: "10.00" }]);
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
    [{ id: categoryId }] = await db
      .insert(accountType)
      .values({ name: `test-batch-${Date.now()}`, direction: "R" })
      .returning({ id: accountType.id });
    [{ id: accountId }] = await db
      .insert(account)
      .values({
        direction: "R",
        description: "test batch",
        categoryId,
        issueDate: "2026-01-01",
        grossValue: "300.00",
        discountValue: "0.00",
        notes: "",
      })
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
    expect(await save({ [`balance_${a}`]: "90.00", [`balance_${b}`]: "200.00" })).toMatchObject({
      formError: expect.stringContaining("outra baixa"),
    });
    // A discount that eats the whole amount is refused on its row
    expect(
      await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00", [`discount_${b}`]: "200,00" }),
    ).toMatchObject({ errors: { [`discount_${b}`]: [expect.any(String)] } });
    // Paid by cheque: its details are asked once for the whole batch
    expect(await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00", method: "CHQ" })).toMatchObject({
      errors: { checkNumber: [expect.any(String)], checkBank: [expect.any(String)] },
    });
    // ...and so is a card's
    expect(await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00", method: "CRE" })).toMatchObject({
      errors: { cardBrand: [expect.any(String)], cardInstallments: [expect.any(String)] },
    });
    expect(await payments()).toHaveLength(0);

    const result = await save({
      method: "CHQ",
      checkNumber: "000777",
      checkBank: "237",
      checkBranch: "0001",
      checkAccount: "12345",
      checkHolderName: "Fulano",
      checkHolderCpf: "12345678900",
      [`balance_${a}`]: "100.00",
      [`balance_${b}`]: "200.00",
      [`penalty_${a}`]: "2,00",
      [`interest_${a}`]: "0,50",
      [`discount_${b}`]: "10,00",
    });
    expect(result).toBe(`REDIRECT /accounts/receivable/${accountId}/edit?msg=payments_created`);
    const saved = Object.fromEntries((await payments()).map((p) => [p.installmentId, p]));
    expect(saved[a]).toMatchObject({
      amount: "102.50",
      penalty: "2.00",
      interest: "0.50",
      discount: "0.00",
      method: "CHQ",
      checkNumber: "000777",
      checkBank: "237",
    });
    expect(saved[b]).toMatchObject({ amount: "190.00", discount: "10.00", checkNumber: "000777" });
    const statuses = await db.select({ s: installment.status }).from(installment).where(inArray(installment.id, ids));
    expect(statuses.map((r) => r.s)).toEqual(["Q", "Q"]);

    // Paid now: a second submit of the same screen is refused
    expect(await save({ [`balance_${a}`]: "100.00", [`balance_${b}`]: "200.00" })).toMatchObject({
      formError: expect.stringContaining("não aceita"),
    });
  });
});
