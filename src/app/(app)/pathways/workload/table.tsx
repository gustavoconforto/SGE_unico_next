import Decimal from "decimal.js";
import { formatDate, label } from "@/lib/finance";
import { WORKLOAD_TYPES } from "@/lib/pathways";
import type { enrollmentWorkload } from "@/lib/pathways-db";
import { offeringLabel } from "../data";

type Rows = NonNullable<Awaited<ReturnType<typeof enrollmentWorkload>>>;

const twoPlaces = (h: Decimal.Value) => new Intl.NumberFormat("pt-BR", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(new Decimal(h).toNumber());

/** The workload rows and total, shared by the screen and its printout (plain table, styled by the caller). */
export function WorkloadTable({ rows, className, cell }: { rows: Rows; className: string; cell: string }) {
  const total = rows.reduce((s, m) => s.plus(m.workload), new Decimal(0));
  const n = `${cell} text-right`;
  return (
    <table className={className}>
      <thead>
        <tr>
          {["Itinerário", "Tipo de carga horária", "Entrada", "Saída"].map((h) => (
            <th key={h} className={`${cell} text-left`}>{h}</th>
          ))}
          <th className={n}>Presenças</th>
          <th className={n}>Carga horária</th>
        </tr>
      </thead>
      <tbody>
        {rows.length ? (
          rows.map((r) => (
            <tr key={r.id}>
              <td className={cell}>{offeringLabel({ pathway: r.pathway, year: r.offeringYear, name: r.offeringName })}</td>
              <td className={cell}>{label(WORKLOAD_TYPES, r.workloadType)}</td>
              <td className={cell}>{formatDate(r.joinedAt)}</td>
              <td className={cell}>{formatDate(r.leftAt) || "-"}</td>
              <td className={n}>{r.present}</td>
              <td className={n}>{twoPlaces(r.workload)} h</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan={6} className={`${cell} text-center text-gray-500`}>
              Nenhum registro encontrado.
            </td>
          </tr>
        )}
      </tbody>
      <tfoot>
        <tr>
          <th colSpan={5} className={n}>Carga horária total</th>
          <th className={n}>{twoPlaces(total)} h</th>
        </tr>
      </tfoot>
    </table>
  );
}
