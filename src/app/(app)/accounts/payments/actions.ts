"use server";

import { type SQL, and, asc, eq, ilike, inArray, or, sql } from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment, accountsPayment as payment, accountsSupplier as supplier, studentsGuardian as guardian } from "@/db/schema/app";
import { PAYMENT_METHODS, PENDING_STATUSES, formatMoney, installmentBalance, money, principal } from "@/lib/finance";
import { lockInstallment, outstandingSql, refreshInstallmentStatus } from "@/lib/finance-db";
import { type FormState, INVALID_CHOICE, REQUIRED, decimalField, foreignKey, parseForm, requiredDate } from "@/lib/form";
import { likePattern } from "@/lib/list";
import { requireSession } from "@/lib/session";
import { type InstallmentChoice, toChoice } from "./data";

const paymentSchema = z.object({
  installmentId: foreignKey,
  paidAt: requiredDate,
  amount: decimalField({ min: 0.01, minMessage: "Informe um valor maior que zero." }),
  // Blank adjustments mean none: the form keeps them collapsed
  penalty: decimalField({ min: 0, optional: true }),
  interest: decimalField({ min: 0, optional: true }),
  monetaryAdjust: decimalField({ min: 0, optional: true }),
  discount: decimalField({ min: 0, optional: true }),
  method: z.enum(PAYMENT_METHODS.map(([c]) => c) as [string, ...string[]], { error: REQUIRED }),
  notes: z.string().trim().max(200).default(""),
});

/** The installment search box: pending installments of one direction (ReceivableInstallmentLookupView). */
export async function searchInstallments(direction: "R" | "P", q: string): Promise<InstallmentChoice[]> {
  await requireSession();
  const p = likePattern(stripAccents(q.trim()));
  const rows = await db
    .select({
      id: installment.id,
      number: installment.number,
      dueDate: installment.dueDate,
      amount: installment.amount,
      description: account.description,
      balance: outstandingSql,
      guardian: guardian.name,
      supplier: supplier.name,
    })
    .from(installment)
    .innerJoin(account, eq(installment.accountId, account.id))
    .leftJoin(guardian, eq(account.guardianId, guardian.id))
    .leftJoin(supplier, eq(account.supplierId, supplier.id))
    .where(
      and(
        eq(account.direction, direction),
        inArray(installment.status, PENDING_STATUSES),
        q.trim() ? (direction === "R" ? orIlike([account.description, guardian.name], p) : orIlike([account.description, supplier.name, supplier.document], p)) : undefined,
      ),
    )
    .orderBy(asc(installment.dueDate), asc(installment.id))
    .limit(10);
  return rows.map(toChoice);
}

// shortcut: accent folding by translate(), since the DB has no unaccent extension (Django owns it); covers pt-BR letters only
const ACCENTED = "áàâãäéèêëíìîïóòôõöúùûüçÁÀÂÃÄÉÈÊËÍÌÎÏÓÒÔÕÖÚÙÛÜÇ";
const PLAIN = "aaaaaeeeeiiiiooooouuuucAAAAAEEEEIIIIOOOOOUUUUC";
const stripAccents = (s: string) => s.normalize("NFD").replace(/\p{Diacritic}/gu, "");
const foldSql = (c: AnyPgColumn): SQL => sql`translate(${c}, ${ACCENTED}, ${PLAIN})`;

/** "agatha" finds "Ágatha": both sides lose their accents. */
function orIlike(columns: AnyPgColumn[], pattern: string) {
  return or(...columns.map((c) => ilike(foldSql(c), pattern)));
}

/**
 * PaymentForm + PaymentSaveMixin: the principal (amount − charges + discount) must be positive and fit the
 * installment's balance, checked again with the installment row locked so a double submit can't pass twice.
 */
export async function savePayment(id: number | null, direction: "R" | "P", returnToAccount: boolean, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(paymentSchema, formData);
  if (!data) return state;
  const fields = { ...data, discount: data.discount ?? "0.00", penalty: data.penalty ?? "0.00", interest: data.interest ?? "0.00", monetaryAdjust: data.monetaryAdjust ?? "0.00" };
  const paid = principal(fields);
  if (paid.lte(0)) return { errors: { amount: ["O valor pago mais o desconto deve ser maior que a soma de multa, juros e correção."] }, values };

  const [previous] = id ? await db.select().from(payment).where(eq(payment.id, id)) : [];
  if (id && !previous) redirect("/accounts/payments");

  const result = await db.transaction(async (tx) => {
    const target = await lockInstallment(tx, data.installmentId);
    const [acc] = target ? await tx.select({ direction: account.direction }).from(account).where(eq(account.id, target.accountId)) : [];
    // Only installments of this direction that still accept payments, plus the current one on edit
    const sameAsBefore = previous?.installmentId === data.installmentId;
    if (!target || acc?.direction !== direction || (!PENDING_STATUSES.includes(target.status) && !sameAsBefore)) return { errors: { installmentId: [INVALID_CHOICE] } };

    let balance = installmentBalance(target.amount, target.status, money(target.paid));
    // The payment being edited is already in the balance
    if (sameAsBefore) balance = balance.plus(principal(previous));
    if (paid.gt(balance))
      return { errors: { amount: [`Esta baixa quitaria R$ ${formatMoney(paid)} da parcela, mas o saldo é R$ ${formatMoney(balance)}. Reduza o valor ou informe multa, juros ou correção.`] } };

    // Moving the payment changes the old installment's balance too
    // shortcut: two edits moving payments between the same two installments in opposite directions deadlock; Postgres aborts one and the user resubmits
    if (previous && !sameAsBefore) await lockInstallment(tx, previous.installmentId);
    if (id) {
      // Deleted by someone else since `previous` was read: report it instead of a "saved" that changed nothing
      const updated = await tx.update(payment).set(fields).where(eq(payment.id, id)).returning({ id: payment.id });
      if (!updated.length) return { errors: { installmentId: ["Este pagamento acabou de ser excluído por outra pessoa."] } };
    } else await tx.insert(payment).values(fields);
    await refreshInstallmentStatus(tx, data.installmentId);
    if (previous && !sameAsBefore) await refreshInstallmentStatus(tx, previous.installmentId);
    return { accountId: target.accountId };
  });
  if ("errors" in result) return { errors: result.errors, values };

  const msg = id ? "payment_updated" : "payment_created";
  // "Baixar" came from an account page: go back there to print the receipt
  if (returnToAccount) redirect(`/accounts/${direction === "R" ? "receivable" : "payable"}/${result.accountId}/edit?msg=${msg}`);
  redirect(`/accounts/payments${direction === "P" ? "?direction=P&" : "?"}msg=${msg}`);
}

export async function deletePayment(id: number) {
  await requireSession();
  await db.transaction(async (tx) => {
    const [row] = await tx.select({ installmentId: payment.installmentId }).from(payment).where(eq(payment.id, id));
    if (!row) return;
    // Like savePayment: a payment saved or deleted at the same moment would leave a stale status
    await lockInstallment(tx, row.installmentId);
    await tx.delete(payment).where(eq(payment.id, id));
    await refreshInstallmentStatus(tx, row.installmentId);
  });
  redirect("/accounts/payments?msg=payment_deleted");
}
