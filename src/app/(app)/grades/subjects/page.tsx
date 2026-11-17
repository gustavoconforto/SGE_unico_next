import { asc, count, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { departmentsDepartment as department, gradesSubject as subject } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteSubject } from "./actions";

export const metadata: Metadata = { title: "Matérias" };

export default async function SubjectListPage({ searchParams }: PageProps<"/grades/subjects">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [subject.name, department.name]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({ id: subject.id, name: subject.name, department: department.name })
      .from(subject)
      .leftJoin(department, eq(subject.departmentId, department.id))
      .where(where)
      .orderBy(asc(subject.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(subject).leftJoin(department, eq(subject.departmentId, department.id)).where(where),
  ]);
  return (
    <ListPage title="Matérias" newHref="/grades/subjects/new" newLabel="Nova matéria" searchPlaceholder="Pesquisar matéria..." headers={["Nome", "Departamento"]} page={page} total={total}>
      {rows.map((s) => (
        <ListRow key={s.id} cells={[s.name, s.department ?? "—"]} label={s.name} editHref={`/grades/subjects/${s.id}/edit`} deleteAction={deleteSubject.bind(null, s.id)} />
      ))}
    </ListPage>
  );
}
