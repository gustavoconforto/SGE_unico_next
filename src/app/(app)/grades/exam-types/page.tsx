import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { gradesExamtype as examType } from "@/db/schema/app";
import { label } from "@/lib/finance";
import { EXAM_KINDS } from "@/lib/grades";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";
import { deleteExamType } from "./actions";

export const metadata: Metadata = { title: "Tipos de avaliação" };

export default async function ExamTypeListPage({ searchParams }: PageProps<"/grades/exam-types">) {
  await requirePermission("academicSetup", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [examType.name, examType.code]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db.select().from(examType).where(where).orderBy(asc(examType.order), asc(examType.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(examType).where(where),
  ]);
  return (
    <ListPage title="Tipos de avaliação" newHref="/grades/exam-types/new" newLabel="Novo tipo de avaliação" searchPlaceholder="Pesquisar por nome ou sigla..." headers={["Sigla", "Nome", "Tipo", "Nota máxima", "Ordem"]} page={page} total={total}>
      {rows.map((t) => (
        <ListRow key={t.id} cells={[t.code, t.name, label(EXAM_KINDS, t.kind), t.maxScore, t.order]} label={`${t.code} - ${t.name}`} editHref={`/grades/exam-types/${t.id}/edit`} deleteAction={deleteExamType.bind(null, t.id)} />
      ))}
    </ListPage>
  );
}
