import { and, count, desc, eq, gte, lte } from "drizzle-orm";
import type { Metadata } from "next";
import { FilterDate, FilterSelect } from "@/components/list-controls";
import { LinkButton } from "@/components/link-button";
import { AccountName, Clip, ListPage, ListRow, MoneyCell } from "@/components/list-page";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment, accountsPayment as payment, accountsSupplier as supplier, studentsGuardian as guardian } from "@/db/schema/app";
import { DIRECTIONS, PAYMENT_METHODS, formatDate, formatMoney, label } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deletePayment } from "./actions";

export const metadata: Metadata = { title: "Baixas" };

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

export default async function PaymentListPage({ searchParams }: PageProps<"/accounts/payments">) {
  const sp = await searchParams;
  const direction = param(sp, "direction");
  const method = param(sp, "method");
  const from = param(sp, "paid_from");
  const to = param(sp, "paid_to");
  const where = and(
    searchWhere(param(sp, "q"), [account.description, guardian.name, supplier.name, payment.notes]),
    ["R", "P"].includes(direction) ? eq(account.direction, direction) : undefined,
    PAYMENT_METHODS.some(([c]) => c === method) ? eq(payment.method, method) : undefined,
    DATE_RE.test(from) ? gte(payment.paidAt, from) : undefined,
    DATE_RE.test(to) ? lte(payment.paidAt, to) : undefined,
  );
  const page = pageParam(sp);
  const from_ = () =>
    db
      .select({
        id: payment.id,
        paidAt: payment.paidAt,
        amount: payment.amount,
        method: payment.method,
        dueDate: installment.dueDate,
        number: installment.number,
        direction: account.direction,
        description: account.description,
        counterpart: guardian.name,
        supplier: supplier.name,
      })
      .from(payment)
      .innerJoin(installment, eq(payment.installmentId, installment.id))
      .innerJoin(account, eq(installment.accountId, account.id))
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .leftJoin(supplier, eq(account.supplierId, supplier.id));
  const [rows, [{ total }]] = await Promise.all([
    from_()
      .where(where)
      .orderBy(desc(payment.paidAt), desc(payment.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(payment)
      .innerJoin(installment, eq(payment.installmentId, installment.id))
      .innerJoin(account, eq(installment.accountId, account.id))
      .leftJoin(guardian, eq(account.guardianId, guardian.id))
      .leftJoin(supplier, eq(account.supplierId, supplier.id))
      .where(where),
  ]);
  return (
    <div className="flex flex-col gap-4">
      <ListPage
        title="Baixas"
        newHref={`/accounts/payments/new${direction === "P" ? "?direction=P" : ""}`}
        newLabel={direction === "P" ? "Novo pagamento" : "Nova baixa"}
        searchPlaceholder="Pesquisar por conta, responsável, fornecedor ou observação..."
        filters={
          <>
            <FilterSelect name="direction" label="Natureza" options={DIRECTIONS} />
            <FilterSelect name="method" label="Forma de pagamento" options={PAYMENT_METHODS} />
            <FilterDate name="paid_from" label="Pago a partir de" />
            <FilterDate name="paid_to" label="Pago até" />
          </>
        }
        headers={["Vencimento", "Pago em", "Natureza", "Conta", "Parcela", "Responsável / Fornecedor", "Forma", "Valor pago"]}
        numeric={["Valor pago"]}
        page={page}
        total={total}
      >
        {rows.map((p) => (
          <ListRow
            primary={3}
            key={p.id}
            cells={[
              formatDate(p.dueDate),
              formatDate(p.paidAt),
              label(DIRECTIONS, p.direction),
              <AccountName key="c" text={p.description} />,
              p.number,
              <Clip key="r" text={p.counterpart ?? p.supplier ?? "—"} className="max-w-36" />,
              label(PAYMENT_METHODS, p.method),
              <MoneyCell key="a">{formatMoney(p.amount)}</MoneyCell>,
            ]}
            label={`a baixa de ${formatDate(p.paidAt)} (${p.description})`}
            editHref={`/accounts/payments/${p.id}/edit`}
            deleteAction={deletePayment.bind(null, p.id)}
            deleteNote={`R$ ${formatMoney(p.amount)} volta ao saldo da ${p.number}ª parcela.`}
          />
        ))}
      </ListPage>
      {direction !== "P" && (
        <div>
          <LinkButton href="/accounts/payments/new?direction=P" color="alternative" size="sm">
            Registrar pagamento a fornecedor
          </LinkButton>
        </div>
      )}
    </div>
  );
}
