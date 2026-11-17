import { count, desc, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { enrollmentsSchoolyear as year } from "@/db/schema/app";
import { formatDate } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteSchoolYear } from "./actions";

export const metadata: Metadata = { title: "Anos escolares" };

export default async function SchoolYearListPage({ searchParams }: PageProps<"/enrollments/school-years">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [sql`${year.begins}::text`, sql`${year.ends}::text`]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select()
      .from(year)
      .where(where)
      .orderBy(desc(year.begins))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(year).where(where),
  ]);
  return (
    <ListPage
      title="Anos escolares"
      newHref="/enrollments/school-years/new"
      newLabel="Novo ano escolar"
      searchPlaceholder="Pesquisar por data..."
      headers={["Começo", "Término", "Dias letivos", "Carga horária"]}
      page={page}
      total={total}
    >
      {rows.map((y) => (
        <ListRow
          key={y.id}
          cells={[formatDate(y.begins), formatDate(y.ends), y.schoolDays ?? "—", y.totalHours ?? "—"]}
          label={`ano escolar ${y.begins.slice(0, 4)}`}
          editHref={`/enrollments/school-years/${y.id}/edit`}
          deleteAction={deleteSchoolYear.bind(null, y.id)}
        />
      ))}
    </ListPage>
  );
}
