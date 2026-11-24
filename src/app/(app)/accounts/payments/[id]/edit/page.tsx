import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  accountsPayment as payment,
} from "@/db/schema/app";
import { requirePermission } from "@/lib/authorization";
import { idParam } from "@/lib/list";
import { installmentChoice } from "../../data";
import { PaymentForm } from "../../payment-form";

export const metadata: Metadata = { title: "Editar baixa" };

export default async function EditPaymentPage({ params }: PageProps<"/accounts/payments/[id]/edit">) {
  // Any payment by id is the book: the proxy only asked payments.edit
  await requirePermission("payments", "view");
  const id = await idParam(params);
  const [row] = await db
    .select({ p: payment, direction: account.direction })
    .from(payment)
    .innerJoin(installment, eq(payment.installmentId, installment.id))
    .innerJoin(account, eq(installment.accountId, account.id))
    .where(eq(payment.id, id));
  if (!row) notFound();
  const direction = row.direction as "R" | "P";
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{direction === "R" ? "Editar baixa" : "Editar pagamento"}</h1>
      <PaymentForm
        id={id}
        direction={direction}
        returnTo={null}
        defaults={row.p}
        selected={await installmentChoice(row.p.installmentId)}
        cancelHref={`/accounts/payments${direction === "P" ? "?direction=P" : ""}`}
      />
    </div>
  );
}
