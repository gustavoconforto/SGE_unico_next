import { and, asc, count, eq, exists, ilike, inArray, or } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  departmentsDepartment as department,
  departmentsDepartmentTeachers as departmentTeachers,
  employeesEmployee as employee,
  gradesSubject as subject,
} from "@/db/schema/app";
import { PAGE_SIZE, likePattern, pageParam, param } from "@/lib/list";
import { ref } from "@/lib/sql";
import { deleteDepartment } from "./actions";

export const metadata: Metadata = { title: "Departamentos" };

function search(q: string) {
  if (!q) return undefined;
  const p = likePattern(q);
  // EXISTS instead of joins, so a department matching twice still appears once
  return or(
    ilike(department.name, p),
    exists(
      db
        .select()
        .from(departmentTeachers)
        .innerJoin(employee, eq(departmentTeachers.employeeId, employee.id))
        .where(and(eq(departmentTeachers.departmentId, ref(department.id)), ilike(employee.name, p))),
    ),
    exists(db.select().from(subject).where(and(eq(subject.departmentId, ref(department.id)), ilike(subject.name, p)))),
  );
}

export default async function DepartmentListPage({ searchParams }: PageProps<"/departments">) {
  const sp = await searchParams;
  const where = search(param(sp, "q"));
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(department).where(where).orderBy(asc(department.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(department).where(where),
  ]);
  const ids = rows.map((d) => d.id);
  const [teachers, subjects] = ids.length
    ? await Promise.all([
        db
          .select({ departmentId: departmentTeachers.departmentId, name: employee.name })
          .from(departmentTeachers)
          .innerJoin(employee, eq(departmentTeachers.employeeId, employee.id))
          .where(inArray(departmentTeachers.departmentId, ids))
          .orderBy(asc(employee.name)),
        db.select({ departmentId: subject.departmentId, name: subject.name }).from(subject).where(inArray(subject.departmentId, ids)).orderBy(asc(subject.name)),
      ])
    : [[], []];
  const namesOf = (list: { departmentId: number | null; name: string }[], id: number) =>
    list.filter((x) => x.departmentId === id).map((x) => x.name).join(", ") || "—";

  return (
    <ListPage
      title="Departamentos"
      newHref="/departments/new"
      newLabel="Novo departamento"
      searchPlaceholder="Pesquisar por departamento, matéria ou professor..."
      headers={["Nome", "Matérias", "Professores"]}
      page={page}
      total={total}
    >
      {rows.map((d) => (
        <ListRow
          key={d.id}
          cells={[d.name, namesOf(subjects, d.id), namesOf(teachers, d.id)]}
          label={d.name}
          editHref={`/departments/${d.id}/edit`}
          deleteAction={deleteDepartment.bind(null, d.id)}
        />
      ))}
    </ListPage>
  );
}
