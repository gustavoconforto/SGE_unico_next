import { type SQL, asc, count, sql } from "drizzle-orm";
import { Badge } from "flowbite-react";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { studentsStudent as student } from "@/db/schema/app";
import { ENROLLMENT_STATUSES, label } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { ref } from "@/lib/sql";

export const metadata: Metadata = { title: "Alunos" };

// The student's latest enrollment tells two same-name students apart: its class and situation
const latest = (column: SQL) =>
  sql<string | null>`(select ${column} from enrollments_enrollment e left join classes_class c on c.id = e.school_class_id
    where e.student_id = ${ref(student.id)} order by e.enrolled_at desc, e.id desc limit 1)`;

export default async function StudentListPage({ searchParams }: PageProps<"/students">) {
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [student.name, student.socialName, student.registration, student.cpf]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: student.id,
        name: student.name,
        registration: student.registration,
        className: latest(sql`concat_ws(' ', c.grade_level || 'º', c.name)`),
        status: latest(sql`e.status`),
      })
      .from(student)
      .where(where)
      .orderBy(asc(student.name))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(student).where(where),
  ]);
  return (
    <ListPage
      title="Alunos"
      newHref="/students/new"
      newLabel="Novo aluno"
      searchPlaceholder="Pesquisar por nome, matrícula ou CPF..."
      headers={["Nome", "Matrícula", "Turma", "Situação"]}
      page={page}
      total={total}
    >
      {rows.map((s) => (
        <ListRow
          key={s.id}
          cells={[
            s.name,
            s.registration,
            s.className || "—",
            s.status ? (
              <Badge key="s" color={s.status === "A" ? "success" : "gray"} className="w-fit">
                {label(ENROLLMENT_STATUSES, s.status)}
              </Badge>
            ) : (
              <span key="s" className="text-gray-600">
                Sem matrícula
              </span>
            ),
          ]}
          label={s.name}
          editHref={`/students/${s.id}/edit`}
        />
      ))}
    </ListPage>
  );
}
