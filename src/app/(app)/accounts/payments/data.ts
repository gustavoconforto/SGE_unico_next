// Read helpers for the payment pages. Not in actions.ts: every export of a "use server" file is a public endpoint.
import { eq } from "drizzle-orm";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  accountsSupplier as supplier,
  studentsGuardian as guardian,
} from "@/db/schema/app";
import { money } from "@/lib/finance";
import { outstandingSql } from "@/lib/finance-db";

/** `party`: the guardian (receivable) or supplier (payable), so a search by name shows why the row matched. */
export type InstallmentChoice = { id: number; label: string; dueDate: string; balance: string; party: string | null };

/** "Contrato Ana - 1ª Série - 2027 · 3ª parcela": due date, payer and balance are shown beside it, not repeated in it. */
const installmentLabel = (i: { description: string; number: number }) => `${i.description} · ${i.number}ª parcela`;
export const toChoice = (r: {
  id: number;
  description: string;
  number: number;
  dueDate: string;
  balance: string;
  guardian: string | null;
  supplier: string | null;
}): InstallmentChoice => ({
  id: r.id,
  label: installmentLabel(r),
  dueDate: r.dueDate,
  balance: money(r.balance).toFixed(2),
  party: r.guardian ?? r.supplier,
});

/** Label of one installment (the edit form shows the current choice). */
export async function installmentChoice(id: number): Promise<InstallmentChoice | null> {
  const [r] = await db
    .select({
      id: installment.id,
      number: installment.number,
      dueDate: installment.dueDate,
      description: account.description,
      balance: outstandingSql,
      guardian: guardian.name,
      supplier: supplier.name,
    })
    .from(installment)
    .innerJoin(account, eq(installment.accountId, account.id))
    .leftJoin(guardian, eq(account.guardianId, guardian.id))
    .leftJoin(supplier, eq(account.supplierId, supplier.id))
    .where(eq(installment.id, id));
  return r ? toChoice(r) : null;
}
