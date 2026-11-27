import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  accountsPayment as payment,
} from "@/db/schema/app";
import { LinkButton } from "@/components/link-button";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { idParam } from "@/lib/list";
import { KINDS } from "../../../kinds";
import { installmentChoice } from "../../data";
import { PaymentForm } from "../../payment-form";

export const metadata: Metadata = { title: "Editar baixa" };

export default async function EditPaymentPage({ params }: PageProps<"/accounts/payments/[id]/edit">) {
  // Any payment by id is the book: the proxy only asked payments.edit
  await requirePermission("payments", "view");
  const id = await idParam(params);
  const [row] = await db
    .select({ p: payment, direction: account.direction, accountId: account.id })
    .from(payment)
    .innerJoin(installment, eq(payment.installmentId, installment.id))
    .innerJoin(account, eq(installment.accountId, account.id))
    .where(eq(payment.id, id));
  if (!row) notFound();
  const direction = row.direction as "R" | "P";
  const kind = direction === "R" ? "receivable" : "payable";
  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-semibold">{direction === "R" ? "Editar baixa" : "Editar pagamento"}</h1>
        {(await hasPermission(KINDS[kind].resource, "view")) && (
          <LinkButton
            href={`/accounts/${kind}/${row.accountId}/receipt?installment=${row.p.installmentId}`}
            size="sm"
            color="alternative"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              receipt
            </span>{" "}
            Imprimir recibo
          </LinkButton>
        )}
      </div>
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
