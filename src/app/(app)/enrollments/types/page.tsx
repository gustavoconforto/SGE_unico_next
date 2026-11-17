import { asc, count, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { enrollmentsEnrollmenttype as enrollmentType, enrollmentsSchoolyear as year, programsProgram as program } from "@/db/schema/app";
import { LEVELS, label } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteEnrollmentType } from "./actions";

export const metadata: Metadata = { title: "Contratos" };

export default async function EnrollmentTypeListPage({ searchParams }: PageProps<"/enrollments/types">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [program.name, enrollmentType.description, sql`${year.begins}::text`]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: enrollmentType.id, level: enrollmentType.level, program: program.name, year: sql<string>`extract(year from ${year.begins})::text` })
      .from(enrollmentType)
      .innerJoin(program, eq(enrollmentType.programId, program.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .where(where)
      .orderBy(desc(year.begins), asc(program.name), asc(enrollmentType.level))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(enrollmentType).innerJoin(program, eq(enrollmentType.programId, program.id)).innerJoin(year, eq(enrollmentType.schoolYearId, year.id)).where(where),
  ]);
  return (
    <ListPage
      title="Contratos"
      newHref="/enrollments/types/new"
      newLabel="Novo contrato"
      searchPlaceholder="Pesquisar por curso, descrição ou ano..."
      headers={["Curso", "Série", "Ano"]}
      page={page}
      total={total}
    >
      {rows.map((t) => (
        <ListRow
          key={t.id}
          cells={[t.program, label(LEVELS, t.level) || "—", t.year]}
          label={`${t.program} ${t.year}`}
          editHref={`/enrollments/types/${t.id}/edit`}
          deleteAction={deleteEnrollmentType.bind(null, t.id)}
        />
      ))}
    </ListPage>
  );
}
