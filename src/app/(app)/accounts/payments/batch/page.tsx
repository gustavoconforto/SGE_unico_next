import { and, asc, eq, inArray, isNotNull } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment } from "@/db/schema/app";
import { PENDING_STATUSES, money } from "@/lib/finance";
import { outstandingSql } from "@/lib/finance-db";
import { hasPermission } from "@/lib/authorization";
import { param } from "@/lib/list";
import { BatchPaymentForm } from "../batch-payment-form";

export const metadata: Metadata = { title: "Baixa de várias parcelas" };

/** ?installment=1&installment=2… from the enrollment page: the pending receivable installments of one account. */
export default async function BatchPaymentPage({ searchParams }: PageProps<"/accounts/payments/batch">) {
  const sp = await searchParams;
  const ids = [sp.installment ?? []].flat().map(Number).filter(Number.isSafeInteger);
  const enrollment = Number(param(sp, "enrollment")) || null;
  // Without the book (payments.view) only enrollment accounts, like saveBatchPayment
  const book = await hasPermission("payments", "view");
  const rows = ids.length
    ? await db
        .select({ id: installment.id, number: installment.number, dueDate: installment.dueDate, balance: outstandingSql, accountId: account.id, description: account.description, enrollmentId: account.enrollmentId })
        .from(installment)
        .innerJoin(account, eq(installment.accountId, account.id))
        .where(and(inArray(installment.id, ids), inArray(installment.status, PENDING_STATUSES), eq(account.direction, "R"), book ? undefined : isNotNull(account.enrollmentId)))
        .orderBy(asc(installment.number))
    : [];
  // One account per batch: the enrollment page only offers its contract's installments
  const accountId = rows[0]?.accountId;
  const valid = rows.filter((r) => r.accountId === accountId);
  const backHref = valid[0]?.enrollmentId ? `/enrollments/${valid[0].enrollmentId}/edit` : enrollment ? `/enrollments/${enrollment}/edit` : accountId ? `/accounts/receivable/${accountId}/edit` : "/enrollments";

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-semibold">Baixa de várias parcelas</h1>
        {valid[0] && <p className="mt-1 text-sm text-gray-600">{valid[0].description}</p>}
      </div>
      {valid.length === 0 ? (
        <p className="text-sm text-gray-700">
          Nenhuma parcela em aberto selecionada.{" "}
          <Link href={backHref} className="font-medium text-primary-700 underline-offset-2 hover:underline">
            Voltar e selecionar
          </Link>
        </p>
      ) : (
        <BatchPaymentForm rows={valid.map((r) => ({ id: r.id, number: r.number, dueDate: r.dueDate, balance: money(r.balance).toFixed(2) }))} cancelHref={backHref} />
      )}
    </div>
  );
}
