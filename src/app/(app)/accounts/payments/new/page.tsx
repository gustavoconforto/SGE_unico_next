import { and, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment } from "@/db/schema/app";
import { PENDING_STATUSES, today } from "@/lib/finance";
import { hasPermission } from "@/lib/access";
import { param } from "@/lib/list";
import { requireSession } from "@/lib/session";
import { installmentChoice } from "../data";
import { PaymentForm } from "../payment-form";

export const metadata: Metadata = { title: "Nova baixa" };

export default async function NewPaymentPage({ searchParams }: PageProps<"/accounts/payments/new">) {
  const sp = await searchParams;
  const installmentId = Number(param(sp, "installment")) || null;
  // "Baixar" on an account or enrollment page: ?installment=<id> prefills it with its balance (only a pending one)
  const [found] = installmentId
    ? await db
        .select({ id: installment.id, direction: account.direction, accountId: account.id, enrollmentId: account.enrollmentId })
        .from(installment)
        .innerJoin(account, eq(installment.accountId, account.id))
        .where(and(eq(installment.id, installmentId), inArray(installment.status, PENDING_STATUSES)))
    : [];
  // Without the book (payments.view) only an enrollment's installment, which the desk sees on the enrollment anyway
  const book = await hasPermission((await requireSession()).user, "payments.view");
  const source = found && (book || found.enrollmentId) ? found : undefined;
  const direction = (source?.direction ?? (param(sp, "direction") === "P" ? "P" : "R")) as "R" | "P";
  const selected = source ? await installmentChoice(source.id) : null;
  const kind = direction === "R" ? "receivable" : "payable";
  // ?enrollment=<id>: came from that enrollment, whose desk may not open the account page
  const fromEnrollment = !!source?.enrollmentId && source.enrollmentId === Number(param(sp, "enrollment"));
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{direction === "R" ? "Nova baixa (recebimento)" : "Novo pagamento"}</h1>
      <PaymentForm
        direction={direction}
        returnTo={fromEnrollment ? "enrollment" : source ? "account" : null}
        selected={selected}
        defaults={selected ? { amount: selected.balance, paidAt: today() } : undefined}
        cancelHref={fromEnrollment ? `/enrollments/${source.enrollmentId}/edit` : source ? `/accounts/${kind}/${source.accountId}/edit` : `/accounts/payments${direction === "P" ? "?direction=P" : ""}`}
      />
    </div>
  );
}
