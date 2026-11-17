import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { programsProgram } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteProgram } from "./actions";

export const metadata: Metadata = { title: "Cursos oferecidos" };

export default async function ProgramListPage({ searchParams }: PageProps<"/programs">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [programsProgram.name]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(programsProgram).where(where).orderBy(asc(programsProgram.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(programsProgram).where(where),
  ]);

  return (
    <ListPage title="Cursos oferecidos" newHref="/programs/new" newLabel="Novo curso" searchPlaceholder="Pesquisar curso..." headers={["Curso"]} page={page} total={total}>
      {rows.map((p) => (
        <ListRow key={p.id} cells={[p.name]} label={p.name} editHref={`/programs/${p.id}/edit`} deleteAction={deleteProgram.bind(null, p.id)} />
      ))}
    </ListPage>
  );
}
