import { and, asc, count, eq, gte, inArray, lte, sql } from "drizzle-orm";
import { Badge, TableCell, TableRow } from "flowbite-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { CellLabel } from "@/components/list-labels";
import { ACTIONS_CELL, AccountName, Clip, ListPage, MoneyCell, PRIMARY_CELL } from "@/components/list-page";
import { db } from "@/db";
import {
  accountsAccount as account,
  accountsInstallment as installment,
  accountsSupplier as supplier,
  enrollmentsEnrollment as enrollment,
  studentsGuardian as guardian,
  studentsStudent as student,
} from "@/db/schema/app";
import { DIRECTIONS, INSTALLMENT_STATUSES, InstallmentStatus, PENDING_STATUSES, formatDate, formatMoney, isOverdue, label, today } from "@/lib/finance";
import { outstandingSql } from "@/lib/finance-db";
import { PAGE_SIZE, pageParam, param, searchWhere, sortParam } from "@/lib/list";
import { kindOf } from "../kinds";

export const metadata: Metadata = { title: "Parcelas" };

const STATUS_CHOICES = [["pending", "Pendentes"], ["overdue", "Vencidas"], ...INSTALLMENT_STATUSES] as const;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function InstallmentListPage({ searchParams }: PageProps<"/accounts/installments">) {
  const sp = await searchParams;
  await connection(); // depends on today's date: never prerender it
  const on = today();
  const direction = param(sp, "direction");
  // A work queue: opens on what is still owed; "all" shows every status
  const status = param(sp, "status") || "pending";
  const from = param(sp, "due_from");
  const to = param(sp, "due_to");
  const statusWhere =
    status === "pending"
      ? inArray(installment.status, PENDING_STATUSES)
      : status === "overdue"
        ? and(inArray(installment.status, PENDING_STATUSES), sql`${installment.dueDate} < ${on}`)
        : INSTALLMENT_STATUSES.some(([c]) => c === status)
          ? eq(installment.status, status)
          : undefined;
  const where = and(
    searchWhere(param(sp, "q"), [account.description, guardian.name, supplier.name, student.name, student.registration]),
    ["R", "P"].includes(direction) ? eq(account.direction, direction) : undefined,
    statusWhere,
    DATE_RE.test(from) ? gte(installment.dueDate, from) : undefined,
    DATE_RE.test(to) ? lte(installment.dueDate, to) : undefined,
  );
  const page = pageParam(sp);
  const sort = sortParam(sp, { due: installment.dueDate, amount: installment.amount });
  const base = db
    .select({
      id: installment.id,
      number: installment.number,
      dueDate: installment.dueDate,
      amount: installment.amount,
      status: installment.status,
      outstanding: outstandingSql,
      accountId: account.id,
      direction: account.direction,
      description: account.description,
      counterpart: sql<string | null>`coalesce(${guardian.name}, ${supplier.name})`,
    })
    .from(installment)
    .innerJoin(account, eq(installment.accountId, account.id))
    .leftJoin(guardian, eq(account.guardianId, guardian.id))
    .leftJoin(supplier, eq(account.supplierId, supplier.id))
    .leftJoin(enrollment, eq(account.enrollmentId, enrollment.id))
    .leftJoin(student, eq(enrollment.studentId, student.id))
    .where(where);
  // Totals over the whole filtered set (not the page), by direction: receivables and payables don't add up
  const sum = (expr: ReturnType<typeof sql>, dir: string, paidOnly = false) =>
    sql<string>`coalesce(sum(${expr}) filter (where ${account.direction} = ${dir}${paidOnly ? sql` and ${installment.status} = 'Q'` : sql``}), 0)`;
  const [rows, [{ total }], [totals]] = await Promise.all([
    base
      .orderBy(...(sort ? [sort.order, asc(installment.id)] : [asc(installment.dueDate), asc(account.description), asc(installment.number)]))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(installment)
      .innerJoin(account, eq(installment.accountId, account.id))
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .leftJoin(supplier, eq(account.supplierId, supplier.id))
      .leftJoin(enrollment, eq(account.enrollmentId, enrollment.id))
      .leftJoin(student, eq(enrollment.studentId, student.id))
      .where(where),
    db
      .select({
        receivableAmount: sum(sql`${installment.amount}`, "R"),
        receivableOutstanding: sum(outstandingSql, "R"),
        receivablePaid: sum(sql`${installment.amount}`, "R", true),
        payableAmount: sum(sql`${installment.amount}`, "P"),
        payableOutstanding: sum(outstandingSql, "P"),
        payablePaid: sum(sql`${installment.amount}`, "P", true),
      })
      .from(installment)
      .innerJoin(account, eq(installment.accountId, account.id))
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .leftJoin(supplier, eq(account.supplierId, supplier.id))
      .leftJoin(enrollment, eq(account.enrollmentId, enrollment.id))
      .leftJoin(student, eq(enrollment.studentId, student.id))
      .where(where),
  ]);

  // Only the totals that can be non-zero here: the direction on screen (receivables and payables don't add up),
  // and paid amounts only when the status filter can include paid installments
  const showPaid = ["all", InstallmentStatus.PAID, InstallmentStatus.PARTIAL].includes(status);
  const totalRows = [
    ...(direction !== "P" ? [["A receber", totals.receivableOutstanding, totals.receivableAmount]] : []),
    ...(direction !== "P" && showPaid ? [["Recebido", totals.receivablePaid, totals.receivableAmount]] : []),
    ...(direction !== "R" ? [["A pagar", totals.payableOutstanding, totals.payableAmount]] : []),
    ...(direction !== "R" && showPaid ? [["Pago", totals.payablePaid, totals.payableAmount]] : []),
  ];
  const showDirection = !["R", "P"].includes(direction);
  const headers = ["Vencimento", ...(showDirection ? ["Natureza"] : []), "Conta", "Parcela", "Responsável / Fornecedor", "Valor", "Faltante", "Situação"];
  const col = (header: string) => headers.indexOf(header);

  return (
    <ListPage
      title="Parcelas"
      newHref="/accounts/installments/new"
      newLabel="Nova parcela"
      searchPlaceholder="Pesquisar por conta, responsável, fornecedor ou aluno..."
      filters={
        <>
          <FilterSelect name="direction" label="Natureza" options={DIRECTIONS} />
          <FilterSelect name="status" label="Situação" options={STATUS_CHOICES} fallback="pending" />
          <FilterDate name="due_from" label="Vencimento a partir de" />
          <FilterDate name="due_to" label="Vencimento até" />
        </>
      }
      summary={
        <dl aria-label="Totais das parcelas filtradas" className="flex flex-wrap gap-x-8 gap-y-2 rounded-lg border border-gray-200 bg-white px-4 py-3">
          {totalRows.map(([title, value, of]) => (
            <div key={title}>
              <dt className="text-xs text-gray-600">{title}</dt>
              <dd className="tabular-nums">
                <span className="font-semibold">R$ {formatMoney(value)}</span> <span className="text-xs text-gray-600">de R$ {formatMoney(of)}</span>
              </dd>
            </div>
          ))}
        </dl>
      }
      headers={headers}
      numeric={["Valor", "Faltante"]}
      sortable={{ Vencimento: "due", Valor: "amount" }}
      sort={sort?.param}
      page={page}
      total={total}
    >
      {rows.map((i) => (
        <TableRow key={i.id}>
          <TableCell className="whitespace-nowrap">
            <CellLabel i={0} />
            {formatDate(i.dueDate)}
          </TableCell>
          {showDirection && (
            <TableCell className="whitespace-nowrap">
              <CellLabel i={col("Natureza")} />
              {label(DIRECTIONS, i.direction)}
            </TableCell>
          )}
          <TableCell className={PRIMARY_CELL}>
            <Link href={`/accounts/${kindOf(i.direction)}/${i.accountId}/edit`} className="underline-offset-2 hover:text-blue-700 hover:underline">
              <AccountName text={i.description} />
            </Link>
          </TableCell>
          <TableCell>
            <CellLabel i={col("Parcela")} />
            {i.number}
          </TableCell>
          <TableCell>
            <CellLabel i={col("Responsável / Fornecedor")} />
            <Clip text={i.counterpart ?? "—"} className="max-w-36" />
          </TableCell>
          <TableCell>
            <CellLabel i={col("Valor")} />
            <MoneyCell>{formatMoney(i.amount)}</MoneyCell>
          </TableCell>
          <TableCell>
            <CellLabel i={col("Faltante")} />
            <MoneyCell>{formatMoney(i.outstanding)}</MoneyCell>
          </TableCell>
          <TableCell>
            <CellLabel i={col("Situação")} />
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
          <TableCell className={ACTIONS_CELL}>
            <div className="flex gap-2 whitespace-nowrap">
              {PENDING_STATUSES.includes(i.status) && (
                <LinkButton href={`/accounts/payments/new?installment=${i.id}`} size="xs" color="alternative" className="px-2" aria-label={`Registrar baixa da parcela ${i.number} de ${i.description}`} data-tip="Registrar baixa">
                  <span className="material-symbols-outlined" aria-hidden="true">
                    price_check
                  </span>
                </LinkButton>
              )}
              <LinkButton href={`/accounts/${kindOf(i.direction)}/${i.accountId}/edit`} size="xs" color="alternative" className="px-2" aria-label={`Abrir a conta ${i.description}`} data-tip="Abrir conta">
                <span className="material-symbols-outlined" aria-hidden="true">
                  open_in_new
                </span>
              </LinkButton>
            </div>
          </TableCell>
        </TableRow>
      ))}
    </ListPage>
  );
}
