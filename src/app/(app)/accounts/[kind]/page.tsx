import { and, asc, count, desc, eq, gte, lte, sql } from "drizzle-orm";
import { Badge } from "flowbite-react";
import type { Metadata } from "next";
import { connection } from "next/server";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { AccountName, Clip, ListPage, ListRow, MoneyCell } from "@/components/list-page";
import { db } from "@/db";
import { accountsAccount as account, accountsAccounttype as accountType, accountsSupplier as supplier, studentsGuardian as guardian, studentsStudent as student } from "@/db/schema/app";
import { accountSituation, formatDate, formatMoney, money, today } from "@/lib/finance";
import { accountStatusWhere, accountSummary, pendingList } from "@/lib/finance-db";
import { PAGE_SIZE, pageParam, param, searchWhere, sortParam } from "@/lib/list";
import { ref } from "@/lib/sql";
import { KINDS, kindParam } from "../kinds";
import { deleteAccount } from "./actions";

export async function generateMetadata({ params }: PageProps<"/accounts/[kind]">): Promise<Metadata> {
  return { title: KINDS[await kindParam(params)].title };
}

const STATUS_CHOICES = [
  ["pending", "Em aberto"],
  ["overdue", "Vencidas"],
  ["paid", "Quitadas"],
  ["cancelled", "Canceladas"],
] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function AccountListPage({ params, searchParams }: PageProps<"/accounts/[kind]">) {
  const kind = await kindParam(params);
  const k = KINDS[kind];
  const sp = await searchParams;
  await connection(); // depends on today's date: never prerender it
  const on = today();
  const q = param(sp, "q");
  const categoryId = Number(param(sp, "category")) || null;
  const from = param(sp, "issue_from");
  const to = param(sp, "issue_to");
  const where = and(
    eq(account.direction, k.direction),
    kind === "receivable"
      ? searchWhere(q, [account.description, guardian.name, student.name, student.registration, account.notes])
      : searchWhere(q, [account.description, supplier.name, supplier.document, account.notes]),
    categoryId ? eq(account.categoryId, categoryId) : undefined,
    accountStatusWhere(param(sp, "status"), on),
    DATE_RE.test(from) ? gte(account.issueDate, from) : undefined,
    DATE_RE.test(to) ? lte(account.issueDate, to) : undefined,
  );
  const page = pageParam(sp);
  const sort = sortParam(sp, { issue: account.issueDate, net: sql`${account.grossValue} - coalesce(${account.discountValue}, 0)` });
  const [rows, [{ total }], categories] = await Promise.all([
    db
      .select({
        id: account.id,
        issueDate: account.issueDate,
        description: account.description,
        category: accountType.name,
        student: student.name,
        counterpart: kind === "receivable" ? guardian.name : supplier.name,
        gross: account.grossValue,
        discount: account.discountValue,
        ...accountSummary(on),
        // Payables show the due date still owed (or the last one) and the last payment
        dueDate: sql<string | null>`coalesce(
          (select i.due_date from accounts_installment i where i.account_id = ${ref(account.id)} and i.status in (${pendingList}) order by i.due_date limit 1),
          (select i.due_date from accounts_installment i where i.account_id = ${ref(account.id)} order by i.due_date desc limit 1))`,
        lastPaidAt: sql<
          string | null
        >`(select p.paid_at from accounts_payment p join accounts_installment i on i.id = p.installment_id where i.account_id = ${ref(account.id)} order by p.paid_at desc limit 1)`,
      })
      .from(account)
      .innerJoin(accountType, eq(account.categoryId, accountType.id))
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .leftJoin(student, eq(account.studentId, student.id))
      .leftJoin(supplier, eq(account.supplierId, supplier.id))
      .where(where)
      .orderBy(...(sort ? [sort.order, asc(account.id)] : [desc(account.issueDate), asc(account.description)]))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(account)
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .leftJoin(student, eq(account.studentId, student.id))
      .leftJoin(supplier, eq(account.supplierId, supplier.id))
      .where(where),
    db.select({ id: accountType.id, name: accountType.name }).from(accountType).where(eq(accountType.direction, k.direction)).orderBy(asc(accountType.name)),
  ]);
  const showPaymentDates = kind === "payable";

  return (
    <ListPage
      title={k.title}
      newHref={`/accounts/${kind}/new`}
      newLabel={k.newLabel}
      searchPlaceholder={kind === "receivable" ? "Pesquisar por descrição, responsável, aluno ou matrícula..." : "Pesquisar por descrição, fornecedor ou CPF/CNPJ..."}
      filters={
        <>
          <FilterSelect name="category" label="Categoria" options={categories.map((c) => [c.id, c.name] as const)} />
          <FilterSelect name="status" label="Situação" options={STATUS_CHOICES} />
          <FilterDate name="issue_from" label="Emitida a partir de" />
          <FilterDate name="issue_to" label="Emitida até" />
        </>
      }
      headers={["Emissão", "Descrição", "Categoria", k.counterpartLabel, "Valor líquido", ...(showPaymentDates ? ["Vencimento", "Pago em"] : []), "Situação"]}
      numeric={["Valor líquido"]}
      sortable={{ Emissão: "issue", "Valor líquido": "net" }}
      sort={sort?.param}
      page={page}
      total={total}
    >
      {rows.map((a) => {
        const situation = accountSituation(a);
        return (
          <ListRow
            key={a.id}
            primary={1}
            cells={[
              formatDate(a.issueDate),
              <span key="d">
                <AccountName text={a.description} />
                {a.student && !a.description.includes(a.student) && <Clip text={a.student} className="text-xs text-gray-500" />}
              </span>,
              a.category,
              a.counterpart ?? "—",
              <MoneyCell key="v">{formatMoney(money(a.gross).minus(money(a.discount)))}</MoneyCell>,
              ...(showPaymentDates ? [formatDate(a.dueDate) || "—", formatDate(a.lastPaidAt) || "—"] : []),
              <span key="s" className="flex flex-col gap-1">
                <Badge color={situation === "Quitada" ? "success" : situation === "Vencida" ? "failure" : "gray"} className="w-fit">
                  {situation}
                </Badge>
                {a.pending > 0 && (
                  <span className="text-xs text-gray-500">
                    {a.pending} de {a.total} parcela{a.total === 1 ? "" : "s"}
                  </span>
                )}
              </span>,
            ]}
            label={a.description}
            editHref={`/accounts/${kind}/${a.id}/edit`}
            deleteAction={deleteAccount.bind(null, kind, a.id)}
            deleteNote={`${a.total === 1 ? "A parcela da conta também é excluída" : `As ${a.total} parcelas da conta também são excluídas`}. Uma conta com baixas registradas não pode ser excluída.`}
          />
        );
      })}
    </ListPage>
  );
}
