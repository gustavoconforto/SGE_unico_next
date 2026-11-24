// Ported from enrollments/tests.py (EnrollmentAccountTests, EnrollmentDiscountTests) and accounts/tests.py.
import { describe, expect, it } from "vitest";
import {
  accountInstallments,
  accountSituation,
  addMonths,
  contractValues,
  enrollmentInstallments,
  installmentBalance,
  isOverdue,
  lopsidedInstallment,
  money,
  initialStatus,
  nextInstallmentStatus,
  paidPrincipal,
  principal,
  splitValue,
  today,
  toDb,
} from "./finance";

const amounts = (rows: { amount: { toFixed(n: number): string } }[]) => rows.map((r) => r.amount.toFixed(2));
const noDiscount = contractValues("1000.00", 0, 0);

describe("enrollment due dates", () => {
  it("enrolling ahead uses the school year (weekends move to Monday)", () => {
    const rows = enrollmentInstallments(noDiscount, "2026-11-05", 2027, 10);
    expect(rows).toHaveLength(12);
    expect(rows[0].dueDate).toBe("2027-01-11"); // Jan 10, 2027 is a Sunday
    expect(rows[1].dueDate).toBe("2027-02-10");
    expect(rows[3].dueDate).toBe("2027-04-12"); // Apr 10 is a Saturday
    expect(rows[11].dueDate).toBe("2027-12-10");
  });

  it("enrolling during the school year runs through December", () => {
    expect(enrollmentInstallments(noDiscount, "2027-09-15", 2027, 10).map((r) => r.dueDate)).toEqual([
      "2027-09-15",
      "2027-10-11", // Oct 10 is a Sunday
      "2027-11-10",
      "2027-12-10",
    ]);
  });
});

describe("lopsided enrollment", () => {
  it("flags a late enrollment whose 11/12 fall on one installment, not a January one", () => {
    const late = lopsidedInstallment(enrollmentInstallments(noDiscount, "2027-11-20", 2027, 10), noDiscount.net);
    expect(late?.number).toBe(2);
    expect(lopsidedInstallment(enrollmentInstallments(noDiscount, "2026-11-05", 2027, 10), noDiscount.net)).toBeNull();
  });
});

describe("enrollment amounts", () => {
  it("first installment is 1/12; the cents of 11/12 go to the second", () => {
    const rows = enrollmentInstallments(noDiscount, "2026-11-05", 2027, 10);
    expect(toDb(rows.reduce((s, r) => s.plus(r.amount), money(0)))).toBe("1000.00");
    expect(amounts(rows).slice(0, 2)).toEqual(["83.33", "83.37"]);
    expect(new Set(amounts(rows).slice(2))).toEqual(new Set(["83.33"]));
  });

  it("splits the remaining 11/12 over the remaining months", () => {
    expect(amounts(enrollmentInstallments(noDiscount, "2027-09-15", 2027, 10))).toEqual([
      "83.33",
      "305.57",
      "305.55",
      "305.55",
    ]);
  });

  it("a single installment carries the whole contract", () => {
    expect(amounts(enrollmentInstallments(noDiscount, "2027-12-01", 2027, 10))).toEqual(["1000.00"]);
  });

  it("each discount group applies to its own installments", () => {
    // 35% of 83.33 + 10% of 916.67
    const values = contractValues("1000.00", 35, 10);
    expect(toDb(values.discount)).toBe("120.84");
    expect(toDb(values.net)).toBe("879.16");
    const rows = enrollmentInstallments(values, "2026-11-16", 2027, 10);
    expect(amounts(rows)[0]).toBe("54.16");
    expect(new Set(amounts(rows).slice(1))).toEqual(new Set(["75.00"]));
  });

  it("discount only on the remaining installments", () => {
    const values = contractValues("1000.00", 0, 20);
    expect(toDb(values.firstNet)).toBe("83.33");
    expect(toDb(values.discount)).toBe("183.33"); // 20% of 916.67
  });
});

describe("account installments (build_installments)", () => {
  it("splits the net value monthly, first takes the remainder, keeps the day", () => {
    expect(splitValue(money("100.00"), 3).map(toDb)).toEqual(["33.34", "33.33", "33.33"]);
    const rows = accountInstallments(money("100.00"), 3, "2027-01-31");
    expect(rows.map((r) => r.dueDate)).toEqual(["2027-01-31", "2027-02-28", "2027-03-31"]);
    expect(addMonths("2027-11-15", 3, 15)).toBe("2028-02-15");
  });
});

describe("payments and status (Payment.principal, Installment.refresh_status)", () => {
  const pay = (
    amount: string,
    extra: Partial<Record<"penalty" | "interest" | "monetaryAdjust" | "discount", string>> = {},
  ) => ({
    amount,
    penalty: "0",
    interest: "0",
    monetaryAdjust: "0",
    discount: "0",
    ...extra,
  });

  it("principal excludes charges and includes the discount", () => {
    expect(
      toDb(principal(pay("110.00", { penalty: "2.00", interest: "3.00", monetaryAdjust: "5.00", discount: "10.00" }))),
    ).toBe("110.00");
  });

  it("moves open → partial → paid; cancelled never changes; expired only to paid", () => {
    expect(nextInstallmentStatus("A", "100.00", paidPrincipal([pay("40.00")]))).toBe("P");
    expect(nextInstallmentStatus("P", "100.00", paidPrincipal([pay("40.00"), pay("60.00")]))).toBe("Q");
    expect(nextInstallmentStatus("Q", "100.00", paidPrincipal([]))).toBe("A");
    expect(nextInstallmentStatus("C", "100.00", paidPrincipal([pay("100.00")]))).toBe("C");
    expect(nextInstallmentStatus("E", "100.00", paidPrincipal([pay("40.00")]))).toBe("E");
    expect(nextInstallmentStatus("E", "100.00", paidPrincipal([pay("100.00")]))).toBe("Q");
  });

  it("a zero installment (100% discount) is paid, never open or overdue", () => {
    expect(nextInstallmentStatus("A", "0.00", paidPrincipal([]))).toBe("Q");
    expect(initialStatus("0.00")).toBe("Q");
    expect(initialStatus("0.01")).toBe("A");
  });

  it("balance is never negative and zero when cancelled", () => {
    expect(toDb(installmentBalance("100.00", "P", money("40")))).toBe("60.00");
    expect(toDb(installmentBalance("100.00", "Q", money("120")))).toBe("0.00");
    expect(toDb(installmentBalance("100.00", "C", money("0")))).toBe("0.00");
  });

  it("overdue is a pending installment past its due date", () => {
    expect(isOverdue("A", "2026-11-15", "2026-11-16")).toBe(true);
    expect(isOverdue("E", "2026-11-15", "2026-11-16")).toBe(true);
    expect(isOverdue("Q", "2026-11-15", "2026-11-16")).toBe(false);
    expect(isOverdue("A", "2026-11-16", "2026-11-16")).toBe(false);
  });

  it("account situation", () => {
    expect(accountSituation({ total: 3, pending: 2, overdue: 1, paid: 1 })).toBe("Vencida");
    expect(accountSituation({ total: 3, pending: 2, overdue: 0, paid: 1 })).toBe("Em aberto");
    expect(accountSituation({ total: 3, pending: 0, overdue: 0, paid: 3 })).toBe("Quitada");
    expect(accountSituation({ total: 3, pending: 0, overdue: 0, paid: 0 })).toBe("Cancelada");
    expect(accountSituation({ total: 0, pending: 0, overdue: 0, paid: 0 })).toBe("Sem parcelas");
  });
});

it("today() is the São Paulo date, not UTC", () => {
  // 01:30 UTC on Nov 17 is still 22:30 on Nov 16 in São Paulo
  expect(today(new Date("2026-11-17T01:30:00Z"))).toBe("2026-11-16");
});
