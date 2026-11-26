import { count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { classesClass as klass, enrollmentsSchoolyear as year, portalAlert as alert } from "@/db/schema/app";
import { hasPermission, requirePermission } from "@/lib/authorization";
import { formatDate, today } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { classLabel, yearOf } from "../enrollments/data";
import { deleteAlert } from "./actions";

export const metadata: Metadata = { title: "Avisos aos responsáveis" };

export default async function AlertListPage({ searchParams }: PageProps<"/alerts">) {
  await requirePermission("alerts", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [alert.title, alert.body]);
  const page = pageParam(sp);
  const [rows, [{ total }], canEdit] = await Promise.all([
    db
      .select({
        id: alert.id,
        createdAt: alert.createdAt,
        title: alert.title,
        className: klass.name,
        gradeLevel: klass.gradeLevel,
        year: yearOf,
      })
      .from(alert)
      .leftJoin(klass, eq(alert.schoolClassId, klass.id))
      .leftJoin(year, eq(klass.yearId, year.id))
      .where(where)
      .orderBy(desc(alert.createdAt), desc(alert.id))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(alert).where(where),
    hasPermission("alerts", "edit"),
  ]);

  return (
    <ListPage
      title="Avisos aos responsáveis"
      newHref={canEdit ? "/alerts/new" : undefined}
      newLabel="Novo aviso"
      searchPlaceholder="Pesquisar aviso..."
      headers={["Título", "Para", "Enviado em"]}
      page={page}
      total={total}
    >
      {rows.map((a) => (
        <ListRow
          key={a.id}
          cells={[
            a.title,
            a.className ? classLabel({ gradeLevel: a.gradeLevel, name: a.className, year: a.year }) : "Todos",
            formatDate(today(new Date(a.createdAt))),
          ]}
          label={a.title}
          deleteAction={canEdit ? deleteAlert.bind(null, a.id) : undefined}
        />
      ))}
    </ListPage>
  );
}
