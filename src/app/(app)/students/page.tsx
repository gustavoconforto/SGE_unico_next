import { type SQL, and, asc, count, isNull, sql } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { studentsStudent as student } from "@/db/schema/app";
import { EnrollmentStatusBadge } from "@/components/enrollment-status-badge";
import { FilterSelect } from "@/components/list-controls";
import { ENROLLMENT_STATUSES } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { ref } from "@/lib/sql";
import { studentName } from "../enrollments/data";
import { hasPermission, requirePermission } from "@/lib/authorization";

export const metadata: Metadata = { title: "Alunos" };

// The student's latest enrollment tells two same-name students apart: its class and situation
const latest = (column: SQL) =>
  sql<
    string | null
  >`(select ${column} from enrollments_enrollment e left join classes_class c on c.id = e.school_class_id
    where e.student_id = ${ref(student.id)} order by e.enrolled_at desc, e.id desc limit 1)`;

export default async function StudentListPage({
  searchParams,
}: PageProps<"/students">) {
  await requirePermission("students", "view");

  const sp = await searchParams;
  // Situação of the latest enrollment, or "N" for students never enrolled
  const situation = param(sp, "situation");
  const status = latest(sql`e.status`);
  const where = and(
    searchWhere(param(sp, "q"), [
      student.name,
      student.socialName,
      student.registration,
      student.cpf,
    ]),
    situation === "N"
      ? isNull(status)
      : ENROLLMENT_STATUSES.some(([code]) => code === situation)
        ? sql`${status} = ${situation}`
        : undefined,
  );
  const page = pageParam(sp);
  const [rows, [{ total }], canEdit] = await Promise.all([
    db
      .select({
        id: student.id,
        // The social name when the student uses one; the civil name stays visible to staff underneath
        name: studentName,
        civilName: student.name,
        registration: student.registration,
        className: latest(sql`concat_ws(' ', c.grade_level || 'º', c.name)`),
        status,
      })
      .from(student)
      .where(where)
      .orderBy(asc(studentName))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(student).where(where),
    hasPermission("students", "edit"),
  ]);
  return (
    <ListPage
      title="Alunos"
      newHref={canEdit ? "/students/new" : undefined}
      newLabel="Novo aluno"
      searchPlaceholder="Pesquisar por nome, matrícula ou CPF..."
      filters={
        <FilterSelect
          name="situation"
          label="Situação"
          options={[...ENROLLMENT_STATUSES, ["N", "Sem matrícula"]]}
        />
      }
      headers={["Nome", "Matrícula", "Turma", "Situação"]}
      empty="Nenhum aluno encontrado. Confira a grafia, ou busque pela matrícula ou pelo CPF."
      page={page}
      total={total}
    >
      {rows.map((s) => (
        <ListRow
          key={s.id}
          cells={[
            s.name === s.civilName ? (
              s.name
            ) : (
              <span key="n">
                {s.name}
                <span className="block text-xs font-normal text-gray-500">
                  Nome civil: {s.civilName}
                </span>
              </span>
            ),
            s.registration,
            s.className || "—",
            s.status ? (
              <EnrollmentStatusBadge key="s" status={s.status} />
            ) : (
              <span key="s" className="text-gray-600">
                Sem matrícula
              </span>
            ),
          ]}
          label={s.name}
          href={`/students/${s.id}`}
          editHref={canEdit ? `/students/${s.id}/edit` : undefined}
        />
      ))}
    </ListPage>
  );
}
