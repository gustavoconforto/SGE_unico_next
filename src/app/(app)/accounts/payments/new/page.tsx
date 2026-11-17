import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment } from "@/db/schema/app";
import { PENDING_STATUSES, today } from "@/lib/finance";
import { param } from "@/lib/list";
import { installmentChoice } from "../data";
import { PaymentForm } from "../payment-form";

export const metadata: Metadata = { title: "Nova baixa" };

export default async function NewPaymentPage({ searchParams }: PageProps<"/accounts/payments/new">) {
  const sp = await searchParams;
  const installmentId = Number(param(sp, "installment")) || null;
  // "Baixar" on an account page: ?installment=<id> prefills it with its balance (only a pending one)
  const [source] = installmentId
    ? await db
        .select({ id: installment.id, direction: account.direction, accountId: account.id })
        .from(installment)
        .innerJoin(account, eq(installment.accountId, account.id))
        .where(and(eq(installment.id, installmentId), inArray(installment.status, PENDING_STATUSES)))
    : [];
  const direction = (source?.direction ?? (param(sp, "direction") === "P" ? "P" : "R")) as "R" | "P";
  const selected = source ? await installmentChoice(source.id) : null;
  const kind = direction === "R" ? "receivable" : "payable";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{direction === "R" ? "Nova baixa (recebimento)" : "Novo pagamento"}</h1>
      <PaymentForm
        direction={direction}
        returnToAccount={!!source}
        selected={selected}
        defaults={selected ? { amount: selected.balance, paidAt: today() } : undefined}
        cancelHref={source ? `/accounts/${kind}/${source.accountId}/edit` : `/accounts/payments${direction === "P" ? "?direction=P" : ""}`}
      />
    </div>
  );
}
