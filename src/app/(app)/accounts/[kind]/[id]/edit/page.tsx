import { requirePermission } from "@/lib/authorization";
import { and, asc, eq } from "drizzle-orm";
import { Badge, Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { InstallmentActions } from "@/components/installment-table";
import { hasPermission } from "@/lib/authorization";
import { LinkButton } from "@/components/link-button";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment } from "@/db/schema/app";
import { INSTALLMENT_STATUSES, formatDate, formatMoney, isOverdue, label, today } from "@/lib/finance";
import { outstandingSql } from "@/lib/finance-db";
import { idParam } from "@/lib/list";
import { enrollmentTypeLabel, getEnrollment } from "../../../../enrollments/data";
import { KINDS, kindParam } from "../../../kinds";
import { AccountForm } from "../../account-form";
import { accountFormOptions } from "../../options";

export const metadata: Metadata = { title: "Editar conta" };

export default async function EditAccountPage({ params }: PageProps<"/accounts/[kind]/[id]/edit">) {
  await requirePermission("finance", "edit");
  const kind = await kindParam(params);
  const id = await idParam(params);
  const [row] = await db
    .select()
    .from(account)
    .where(and(eq(account.id, id), eq(account.direction, KINDS[kind].direction)));
  if (!row) notFound();
  const on = today();
  const [options, installments, contract, canPay] = await Promise.all([
    accountFormOptions(kind),
    db
      .select({ id: installment.id, number: installment.number, dueDate: installment.dueDate, amount: installment.amount, status: installment.status, outstanding: outstandingSql })
      .from(installment)
      .where(eq(installment.accountId, id))
      .orderBy(asc(installment.dueDate), asc(installment.number)),
    row.enrollmentId ? getEnrollment(row.enrollmentId) : null,
    hasPermission("payments", "edit"),
  ]);

  return (
    <div className="flex max-w-4xl flex-col gap-4">
      <h1 className="text-2xl font-semibold">
        {KINDS[kind].title} — {row.description}
      </h1>
      <AccountForm
        kind={kind}
        id={id}
        defaults={row}
        options={options}
        enrollmentLabel={contract ? `${contract.studentName} - ${enrollmentTypeLabel(contract.program, contract.level, contract.schoolYear)}` : undefined}
        cancelHref={`/accounts/${kind}`}
      />
      <section className="flex flex-col gap-2 rounded-lg border border-gray-200 p-4 dark:border-gray-700">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="font-semibold">Parcelas</h2>
          <div className="flex gap-2">
            <LinkButton href={`/accounts/${kind}/${id}/receipt`} size="xs" color="alternative">
              Recibo da conta
            </LinkButton>
            <LinkButton href={`/accounts/installments/new?account=${id}`} size="xs" color="alternative">
              Adicionar parcela
            </LinkButton>
          </div>
        </div>
        {installments.length === 0 ? (
          <p className="text-sm text-gray-500">Nenhuma parcela gerada para esta conta.</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHead>
                <TableRow>
                  <TableHeadCell className="w-20">Parcela</TableHeadCell>
                  <TableHeadCell>Vencimento</TableHeadCell>
                  <TableHeadCell className="text-right">Valor</TableHeadCell>
                  <TableHeadCell>Situação</TableHeadCell>
                  <TableHeadCell className="text-right">Faltante</TableHeadCell>
                  <TableHeadCell>Ações</TableHeadCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {installments.map((i) => (
                  <TableRow key={i.id}>
                    <TableCell>{i.number}</TableCell>
                    <TableCell>{formatDate(i.dueDate)}</TableCell>
                    <TableCell className="text-right">{formatMoney(i.amount)}</TableCell>
                    <TableCell>
                      {isOverdue(i.status, i.dueDate, on) ? (
                        <Badge color="failure" className="w-fit">
                          Vencida
                        </Badge>
                      ) : (
                        <Badge color={i.status === "Q" ? "success" : "gray"} className="w-fit">
                          {label(INSTALLMENT_STATUSES, i.status)}
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell className="text-right">{formatMoney(i.outstanding)}</TableCell>
                    <TableCell>
<InstallmentActions receiptHref={`/accounts/${kind}/${id}/receipt`} installment={i} canPay={canPay} />
</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </section>
    </div>
  );
}
