// Port of the money rules in accounts/models.py, accounts/services.py and enrollments/models.py.
// Money is decimal.js (never number); Postgres numeric comes in and goes out as a 2-decimal string.
// Dates are "YYYY-MM-DD" strings, like Drizzle returns `date` columns.
import Decimal from "decimal.js";
import { adjustWeekend } from "./dates";

export type Money = Decimal;
export const ZERO = new Decimal(0);
export const money = (value: Decimal.Value | null | undefined): Money => new Decimal(value ?? 0);
/** Value for a numeric(…, 2) column. */
export const toDb = (value: Money): string => value.toFixed(2);
/** "1.234,56" (no currency symbol), as the Django templates show money. */
export const formatMoney = (value: Decimal.Value | null | undefined): string =>
  new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
    money(value).toNumber(),
  );
// toNumber() above is display-only; amounts up to 10 digits are exact in a double.

const cents = (value: Money, rounding: Decimal.Rounding) => value.toDecimalPlaces(2, rounding);

// --- choices -------------------------------------------------------------------

export const Direction = { RECEIVABLE: "R", PAYABLE: "P" } as const;
export const DIRECTIONS = [
  ["R", "A receber"],
  ["P", "A pagar"],
] as const;

export const InstallmentStatus = { OPEN: "A", PARTIAL: "P", PAID: "Q", CANCELLED: "C", EXPIRED: "E" } as const;
export const INSTALLMENT_STATUSES = [
  ["A", "Em aberto"],
  ["P", "Paga parcialmente"],
  ["Q", "Quitada"],
  ["C", "Cancelada"],
  ["E", "Expirada"],
] as const;
/** Still owed. EXPIRED = the bank wrote off the unpaid slip; the debt remains. */
export const PENDING_STATUSES: string[] = [
  InstallmentStatus.OPEN,
  InstallmentStatus.PARTIAL,
  InstallmentStatus.EXPIRED,
];

export const PAYMENT_METHODS = [
  ["PIX", "PIX"],
  ["BOL", "Boleto"],
  ["DIN", "Dinheiro"],
  ["CRE", "Cartão de crédito"],
  ["DEB", "Cartão de débito"],
  ["TED", "Transferência"],
  ["CHQ", "Cheque"],
] as const;

export const CARD_BRANDS = [
  ["VIS", "Visa"],
  ["MAS", "Mastercard"],
  ["ELO", "Elo"],
  ["AMX", "American Express"],
  ["HIP", "Hipercard"],
  ["DIN", "Diners Club"],
  ["CAB", "Cabal"],
  ["BAN", "Banescard"],
  ["SOR", "Sorocred"],
  ["JCB", "JCB"],
  ["DIS", "Discover"],
  ["OUT", "Outra"],
] as const;
/** Credit card installments a payment may be split into ("parcelado no cartão"). */
export const MAX_CARD_INSTALLMENTS = 12;

export const ENROLLMENT_STATUSES = [
  ["A", "Ativa"],
  ["T", "Transferida"],
  ["D", "Desistente"],
  ["C", "Concluída"],
  ["X", "Cancelada"],
] as const;
/** Ending an enrollment early cancels its future installments. */
export const ENDED_EARLY = ["T", "D", "X"];

export const LEVELS = [
  ["1", "1ª Série"],
  ["2", "2ª Série"],
  ["3", "3ª Série"],
] as const;

export const label = (choices: readonly (readonly [string, string])[], code: string | null | undefined) =>
  choices.find(([c]) => c === code)?.[1] ?? code ?? "";

/** "Visa · 3x · comprovante 123456"; "" when the payment has no card details. */
export const cardSummary = (p: {
  method: string;
  cardBrand: string;
  cardReceipt: string;
  cardInstallments: number | null;
}) =>
  p.cardBrand
    ? [
        label(CARD_BRANDS, p.cardBrand),
        p.method === "CRE" && p.cardInstallments && (p.cardInstallments === 1 ? "à vista" : `${p.cardInstallments}x`),
        `comprovante ${p.cardReceipt}`,
      ]
        .filter(Boolean)
        .join(" · ")
    : "";

// --- dates ---------------------------------------------------------------------

/** Today in the school's time zone (Django TIME_ZONE = America/Sao_Paulo), as YYYY-MM-DD. */
export function today(now = new Date()): string {
  return new Intl.DateTimeFormat("en-CA", { timeZone: "America/Sao_Paulo" }).format(now);
}

export const formatDate = (iso: string | null | undefined) =>
  iso ? iso.slice(0, 10).split("-").reverse().join("/") : "";

const daysInMonth = (year: number, month: number) => new Date(Date.UTC(year, month, 0)).getUTCDate();
const iso = (year: number, month: number, day: number) =>
  `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;

/** `months` after `start`, on `day` (or the month's last day if shorter). */
export function addMonths(start: string, months: number, day: number): string {
  const [y, m] = start.split("-").map(Number);
  const index = m - 1 + months;
  const year = y + Math.floor(index / 12);
  const month = (index % 12) + 1;
  return iso(year, month, Math.min(day, daysInMonth(year, month)));
}

// --- splitting values ----------------------------------------------------------

/** Every part rounded down to the cent; the first takes the remainder, so the parts add up to `total`. */
export function splitValue(total: Money, count: number): Money[] {
  const part = cents(total.div(count), Decimal.ROUND_DOWN);
  return [total.minus(part.times(count - 1)), ...Array<Money>(count - 1).fill(part)];
}

/** build_installments(): N monthly installments of the account's net value from the first due date. */
export function accountInstallments(netValue: Money, count: number, firstDueDate: string) {
  const day = Number(firstDueDate.slice(8, 10));
  return splitValue(netValue, count).map((amount, i) => ({
    number: i + 1,
    dueDate: addMonths(firstDueDate, i, day),
    amount,
  }));
}

// --- enrollment contract -------------------------------------------------------

export const percentOf = (value: Money, percent: Money) => cents(value.times(percent).div(100), Decimal.ROUND_HALF_UP);

/** The contract's values: the first installment is 1/12 of it, each group with its own discount. */
export function contractValues(
  grossValue: Decimal.Value,
  firstDiscountPercent: Decimal.Value,
  remainingDiscountPercent: Decimal.Value,
) {
  const gross = money(grossValue);
  const firstGross = cents(gross.div(12), Decimal.ROUND_HALF_UP);
  const remainingGross = gross.minus(firstGross);
  const firstDiscount = percentOf(firstGross, money(firstDiscountPercent));
  const remainingDiscount = percentOf(remainingGross, money(remainingDiscountPercent));
  const discount = firstDiscount.plus(remainingDiscount);
  return {
    gross,
    firstGross,
    remainingGross,
    firstDiscount,
    remainingDiscount,
    firstNet: firstGross.minus(firstDiscount),
    remainingNet: remainingGross.minus(remainingDiscount),
    discount,
    net: gross.minus(discount),
    overallDiscountPercent: gross.isZero() ? ZERO : cents(discount.times(100).div(gross), Decimal.ROUND_HALF_UP),
  };
}
export type ContractValues = ReturnType<typeof contractValues>;

/**
 * Monthly due dates on dueDay, through December of the school year (weekends move to Monday).
 * Enrolling during the school year: the first is due on enrollment, then one per remaining month.
 * Enrolling ahead: 12 installments, January to December.
 */
export function enrollmentDueDates(enrolledAt: string, schoolYear: number, dueDay: number): string[] {
  const [year, month] = enrolledAt.split("-").map(Number);
  const during = year === schoolYear;
  const months = during
    ? Array.from({ length: 12 - month }, (_, i) => month + 1 + i)
    : Array.from({ length: 12 }, (_, i) => i + 1);
  return [...(during ? [enrolledAt] : []), ...months.map((m) => adjustWeekend(iso(schoolYear, m, dueDay)))];
}

/** First installment = 1/12 with its discount; the other 11/12 split over the rest. One installment carries both. */
export function enrollmentAmounts(values: ContractValues, count: number): Money[] {
  if (count === 1) return [values.net];
  return [values.firstNet, ...splitValue(values.remainingNet, count - 1)];
}

/** The installments an enrollment generates (create_enrollment_account). */
export function enrollmentInstallments(values: ContractValues, enrolledAt: string, schoolYear: number, dueDay: number) {
  const dueDates = enrollmentDueDates(enrolledAt, schoolYear, dueDay);
  const amounts = enrollmentAmounts(values, dueDates.length);
  return dueDates.map((dueDate, i) => ({ number: i + 1, dueDate, amount: amounts[i] }));
}

/** Enrolling late in the year piles the remaining 11/12 onto few installments: the one holding over half the net value, or null. */
export function lopsidedInstallment<T extends { amount: Money }>(installments: T[], net: Money): T | null {
  if (installments.length < 2 || !net.gt(0)) return null;
  const heaviest = installments.reduce((max, i) => (i.amount.gt(max.amount) ? i : max));
  return heaviest.amount.div(net).gt(0.5) ? heaviest : null;
}

// --- payments and installment status --------------------------------------------

export type PaymentValues = {
  amount: Decimal.Value;
  penalty: Decimal.Value;
  interest: Decimal.Value;
  monetaryAdjust: Decimal.Value;
  discount: Decimal.Value;
};

/** Principal settled by a payment: amount − penalty − interest − adjustment + discount. */
export function principal(p: PaymentValues): Money {
  return money(p.amount)
    .minus(money(p.penalty))
    .minus(money(p.interest))
    .minus(money(p.monetaryAdjust))
    .plus(money(p.discount));
}

export const paidPrincipal = (payments: PaymentValues[]) => payments.reduce((sum, p) => sum.plus(principal(p)), ZERO);

/** Installment.balance(): nothing is owed on a cancelled installment; never negative. */
export function installmentBalance(amount: Decimal.Value, status: string, paid: Money): Money {
  if (status === InstallmentStatus.CANCELLED) return ZERO;
  return Decimal.max(money(amount).minus(paid), ZERO);
}

/** Installment.refresh_status(): status from the principal paid. Cancelled never changes; expired only moves to paid. */
export function nextInstallmentStatus(current: string, amount: Decimal.Value, paid: Money): string {
  if (current === InstallmentStatus.CANCELLED) return current;
  // Paid first: a zero installment (100% discount) is settled, never open or overdue
  const status = paid.gte(money(amount))
    ? InstallmentStatus.PAID
    : paid.lte(0)
      ? InstallmentStatus.OPEN
      : InstallmentStatus.PARTIAL;
  if (current === InstallmentStatus.EXPIRED && status !== InstallmentStatus.PAID) return current;
  return status;
}

/** Status of a new installment: open, or already paid when it is worth nothing. */
export const initialStatus = (amount: Decimal.Value) => nextInstallmentStatus(InstallmentStatus.OPEN, amount, ZERO);

export const isOverdue = (status: string, dueDate: string, on = today()) =>
  PENDING_STATUSES.includes(status) && dueDate < on;

/** Account.situation from its installment counts. */
export function accountSituation(c: { total: number; pending: number; overdue: number; paid: number }): string {
  if (c.overdue) return "Vencida";
  if (c.pending) return "Em aberto";
  if (c.paid) return "Quitada";
  if (c.total) return "Cancelada";
  return "Sem parcelas";
}
