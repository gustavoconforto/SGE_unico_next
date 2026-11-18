import { type SQL, and, count, eq, inArray, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { connection } from "next/server";
import Link from "next/link";
import { LinkButton } from "@/components/link-button";
import { HomeSearchInput } from "./home-search";
import { db } from "@/db";
import { accountsAccount as account, accountsInstallment as installment, enrollmentsEnrollment as enrollment } from "@/db/schema/app";
import { Direction, PENDING_STATUSES, formatMoney, today } from "@/lib/finance";
import { outstandingSql } from "@/lib/finance-db";
import { userAccess } from "@/lib/access";
import { canOpen } from "@/lib/permissions";
import { requireSession } from "@/lib/session";

export const metadata: Metadata = { title: "Início" };

/** Receivable installments still owed whose due date matches `where`: how many and how much is left. */
function receivable(where: SQL) {
  return db
    .select({ n: count(), total: sql<string>`coalesce(sum(${outstandingSql}), 0)` })
    .from(installment)
    .innerJoin(account, eq(installment.accountId, account.id))
    .where(and(eq(account.direction, Direction.RECEIVABLE), inArray(installment.status, PENDING_STATUSES), where));
}

/** The secretaria's start page: find a student, start the usual tasks, see what needs attention today. */
export default async function HomePage() {
  await connection(); // depends on today's date: never prerender it
  const on = today();
  const { all, granted } = await userAccess((await requireSession()).user);
  // Only what this user's groups allow: links they can open, totals of the areas they can see
  const can = (href: string) => canOpen(href.split("?")[0], granted, all);
  // Totals only for the areas this user can open: nothing is computed just to be hidden
  const none = [{ n: 0, total: "0" }];
  const [[overdue], [dueToday], [enrolled]] = await Promise.all([
    can("/accounts/installments") ? receivable(sql`${installment.dueDate} < ${on}`) : none,
    can("/accounts/installments") ? receivable(sql`${installment.dueDate} = ${on}`) : none,
    can("/enrollments") ? db.select({ n: count() }).from(enrollment).where(eq(enrollment.enrolledAt, on)) : none,
  ]);
  const dateLabel = new Intl.DateTimeFormat("pt-BR", { weekday: "long", day: "numeric", month: "long", timeZone: "America/Sao_Paulo" }).format(new Date());

  const actions = [
    { href: "/enrollments/new", label: "Nova matrícula" },
    { href: "/students/new", label: "Novo aluno" },
    { href: "/guardians/new", label: "Novo responsável" },
    { href: "/accounts/payments/new", label: "Registrar baixa" },
  ].filter((a) => can(a.href));
  const allRows = [
    { label: "Parcelas a receber vencidas", n: overdue.n, total: overdue.total, alert: true, href: "/accounts/installments?direction=R&status=overdue" },
    { label: "Parcelas a receber que vencem hoje", n: dueToday.n, total: dueToday.total, href: `/accounts/installments?direction=R&status=pending&due_from=${on}&due_to=${on}` },
    { label: "Matrículas feitas hoje", n: enrolled.n, href: "/enrollments" },
  ];
  const todayRows = allRows.filter((r) => can(r.href));

  return (
    <div className="flex max-w-3xl flex-col gap-8">
      <div>
        <h1 className="text-2xl font-semibold">Início</h1>
        <p className="mt-1 text-sm text-gray-600 first-letter:uppercase">{dateLabel}</p>
      </div>

      {/* A plain GET form: works before hydration and lands on the student list already filtered */}
      {can("/students") && (
        <form action="/students" role="search" className="flex flex-col gap-1.5">
          <label htmlFor="home-search" className="text-sm font-medium">
            Buscar aluno
          </label>
          <div className="flex gap-2">
            <HomeSearchInput />
            <button type="submit" className="rounded-lg bg-primary-700 px-4 text-sm font-medium text-white hover:bg-primary-800 focus:ring-4 focus:ring-primary-300 focus:outline-none">
              Buscar
            </button>
          </div>
        </form>
      )}

      {actions.length > 0 && (
        <section aria-labelledby="home-actions" className="flex flex-col gap-3">
          <h2 id="home-actions" className="text-lg font-semibold">
            Começar
          </h2>
          <div className="flex flex-wrap gap-2">
            {actions.map((a, i) => (
              <LinkButton key={a.href} href={a.href} color={i === 0 ? undefined : "alternative"}>
                {a.label}
              </LinkButton>
            ))}
          </div>
        </section>
      )}

      {todayRows.length > 0 && (
        <section aria-labelledby="home-today" className="flex flex-col gap-3">
          <h2 id="home-today" className="text-lg font-semibold">
            Hoje
          </h2>
          <ul className="divide-y divide-gray-200 overflow-hidden rounded-lg border border-gray-200 bg-white">
            {todayRows.map((row) => (
              <li key={row.label}>
                <Link href={row.href} className="flex items-center gap-3 px-4 py-3 hover:bg-gray-50 focus-visible:bg-gray-50">
                  <span className="flex-1">
                    {row.label}
                    {/* Phones: the amount under the label, since there's no room for its own column */}
                    {row.total !== undefined && <span className="block text-sm text-gray-600 tabular-nums sm:hidden">R$ {formatMoney(row.total)}</span>}
                  </span>
                  <span className={`font-semibold tabular-nums ${row.alert && row.n > 0 ? "text-red-700" : ""}`}>{row.n.toLocaleString("pt-BR")}</span>
                  {row.total !== undefined && <span className="hidden w-32 text-right text-sm whitespace-nowrap text-gray-600 tabular-nums sm:block">R$ {formatMoney(row.total)}</span>}
                  <span className="material-symbols-outlined text-gray-400" aria-hidden="true">
                    chevron_right
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
