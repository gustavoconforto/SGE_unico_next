import { Table, TableBody, TableCell, TableHead, TableHeadCell, TableRow } from "flowbite-react";
import { InstallmentStatus, type Money, PENDING_STATUSES, formatDate, formatMoney } from "@/lib/finance";
import { LinkButton } from "./link-button";

/**
 * The installments a save will create, as previewed on the enrollment and account forms.
 * `shifted`: numbers of the installments whose due date was moved off a weekend, marked as such.
 */
export function InstallmentTable({
  rows,
  shifted,
}: {
  rows: { number: number; dueDate: string; amount: Money }[];
  shifted?: Set<number>;
}) {
  return (
    <Table className="[&_td]:px-3 [&_th]:px-3">
      <TableHead>
        <TableRow>
          <TableHeadCell className="w-20">Parcela</TableHeadCell>
          <TableHeadCell>Vencimento</TableHeadCell>
          <TableHeadCell className="text-right">Valor (R$)</TableHeadCell>
        </TableRow>
      </TableHead>
      <TableBody>
        {rows.map((i) => (
          <TableRow key={i.number}>
            <TableCell className="tabular-nums">{i.number}ª</TableCell>
            <TableCell className="tabular-nums">
              {formatDate(i.dueDate)}
              {shifted?.has(i.number) && <span className="ml-1.5 text-xs text-gray-600">fim de semana → segunda</span>}
            </TableCell>
            <TableCell className="text-right tabular-nums">{formatMoney(i.amount)}</TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}

/**
 * An account's installment row actions: the receipt once something was paid, a payment while something is owed.
 * `due`: the installment to collect now (overdue or next), whose payment button is spelled out instead of an icon.
 * `enrollmentId`: on an enrollment page, the payment returns there. `canPay`: holds payments.edit.
 */
export function InstallmentActions({
  receiptHref,
  installment,
  due,
  enrollmentId,
  canPay,
}: {
  receiptHref: string;
  installment: { id: number; number: number; status: string };
  due?: boolean;
  enrollmentId?: number;
  canPay: boolean;
}) {
  const payHref = `/accounts/payments/new?installment=${installment.id}${enrollmentId ? `&enrollment=${enrollmentId}` : ""}`;
  return (
    <div className="flex gap-2 whitespace-nowrap">
      {(installment.status === InstallmentStatus.PAID || installment.status === InstallmentStatus.PARTIAL) && (
        <LinkButton
          href={`${receiptHref}?installment=${installment.id}`}
          size="xs"
          color="alternative"
          className="px-2"
          aria-label={`Recibo da parcela ${installment.number}`}
          data-tip="Recibo"
        >
          <span className="material-symbols-outlined" aria-hidden="true">
            receipt
          </span>
        </LinkButton>
      )}
      {canPay &&
        PENDING_STATUSES.includes(installment.status) &&
        (due ? (
          <LinkButton
            href={payHref}
            size="xs"
            color="alternative"
            className="gap-1 px-2"
            aria-label={`Registrar baixa da parcela ${installment.number}`}
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              price_check
            </span>
            Registrar baixa
          </LinkButton>
        ) : (
          <LinkButton
            href={payHref}
            size="xs"
            color="alternative"
            className="px-2"
            aria-label={`Registrar baixa da parcela ${installment.number}`}
            data-tip="Registrar baixa"
          >
            <span className="material-symbols-outlined" aria-hidden="true">
              price_check
            </span>
          </LinkButton>
        ))}
    </div>
  );
}
