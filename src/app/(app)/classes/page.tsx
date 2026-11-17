import { asc, count, desc, eq, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { LinkButton } from "@/components/link-button";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { classesClass as klass, enrollmentsSchoolyear as year, programsProgram as program } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteClass } from "./actions";
import { yearLabel } from "./options";

export const metadata: Metadata = { title: "Turmas" };

export default async function ClassListPage({ searchParams }: PageProps<"/classes">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [klass.name, program.name, sql`${year.begins}::text`]);
  const page = pageParam(sp);
  const from = () =>
    db
      .select({ id: klass.id, name: klass.name, gradeLevel: klass.gradeLevel, program: program.name, year: yearLabel })
      .from(klass)
      .innerJoin(program, eq(klass.programId, program.id))
      .innerJoin(year, eq(klass.yearId, year.id));
  const [rows, [{ total }]] = await Promise.all([
    from()
      .where(where)
      .orderBy(desc(year.begins), asc(program.name), asc(klass.gradeLevel), asc(klass.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(klass)
      .innerJoin(program, eq(klass.programId, program.id))
      .innerJoin(year, eq(klass.yearId, year.id))
      .where(where),
  ]);

  return (
    <div className="flex flex-col gap-4">
      <ListPage title="Turmas" newHref="/classes/new" newLabel="Nova turma" searchPlaceholder="Pesquisar por turma, curso ou ano..." headers={["Curso", "Ano", "Série", "Nome"]} page={page} total={total}>
        {rows.map((c) => (
          <ListRow
            key={c.id}
            cells={[c.program, c.year, c.gradeLevel ?? "—", c.name]}
            label={c.name}
            editHref={`/classes/${c.id}/edit`}
            deleteAction={deleteClass.bind(null, c.id)}
          />
        ))}
      </ListPage>
      <div>
        <LinkButton href="/classes/detail" color="alternative">Alunos da turma</LinkButton>
      </div>
    </div>
  );
}
