import { requirePermission } from "@/lib/authorization";
import { count, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import {
  classesClass as klass,
  documentsDocumenttype as documentType,
  documentsReceiveddocument as t,
  enrollmentsEnrollment as enrollment,
  studentsStudent as student,
} from "@/db/schema/app";
import { formatDate, today } from "@/lib/finance";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { classCell, studentColumns } from "@/app/(app)/incidents/records";
import { deleteReceivedDocument } from "./actions";

export const metadata: Metadata = { title: "Recebimento de documentos" };

export default async function ReceivedDocumentListPage({ searchParams }: PageProps<"/documents">) {
  await requirePermission("documents", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [student.name, student.socialName, documentType.type]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db
      .select({
        id: t.id,
        receivedDate: t.receivedDate,
        createdAt: t.createdAt,
        type: documentType.type,
        ...studentColumns,
      })
      .from(t)
      .innerJoin(documentType, eq(t.documentTypeId, documentType.id))
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .where(where)
      .orderBy(desc(t.receivedDate), desc(t.createdAt))
      .limit(PAGE_SIZE)
      .offset((page - 1) * PAGE_SIZE),
    db
      .select({ total: count() })
      .from(t)
      .innerJoin(documentType, eq(t.documentTypeId, documentType.id))
      .innerJoin(enrollment, eq(t.enrollmentId, enrollment.id))
      .innerJoin(student, eq(enrollment.studentId, student.id))
      .where(where),
  ]);
  return (
    <ListPage
      title="Recebimento de documentos"
      newHref="/documents/new"
      newLabel="Registrar documento"
      searchPlaceholder="Pesquisar por aluno ou tipo..."
      headers={["Data", "Aluno", "Turma", "Tipo", "Registrado em"]}
      page={page}
      total={total}
    >
      {rows.map((r) => (
        <ListRow
          key={r.id}
          cells={[
            formatDate(r.receivedDate),
            r.student,
            classCell(r),
            r.type,
            formatDate(today(new Date(r.createdAt))),
          ]}
          label={`o documento de ${r.student}`}
          editHref={`/documents/${r.id}/edit`}
          deleteAction={deleteReceivedDocument.bind(null, r.id)}
        />
      ))}
    </ListPage>
  );
}
