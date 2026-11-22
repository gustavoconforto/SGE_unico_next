import { requirePermission } from "@/lib/authorization";
import { asc, count } from "drizzle-orm";
import type { Metadata } from "next";
import { ListPage, ListRow } from "@/components/list-page";
import { db } from "@/db";
import { studentsGuardian as guardian } from "@/db/schema/app";
import { PAGE_SIZE, pageParam, param, searchWhere } from "@/lib/list";

export const metadata: Metadata = { title: "Responsáveis" };

export default async function GuardianListPage({ searchParams }: PageProps<"/guardians">) {
  await requirePermission("students", "view");
  const sp = await searchParams;
  const where = searchWhere(param(sp, "q"), [guardian.name, guardian.cpf]);
  const page = pageParam(sp);
  const [rows, [{ total }]] = await Promise.all([
    db.select({ id: guardian.id, name: guardian.name }).from(guardian).where(where).orderBy(asc(guardian.name)).limit(PAGE_SIZE).offset((page - 1) * PAGE_SIZE),
    db.select({ total: count() }).from(guardian).where(where),
  ]);
  return (
    <ListPage title="Responsáveis" newHref="/guardians/new" newLabel="Novo responsável" searchPlaceholder="Pesquisar por nome ou CPF..." headers={["Nome"]} page={page} total={total}>
      {rows.map((g) => (
        <ListRow key={g.id} cells={[g.name]} label={g.name} editHref={`/guardians/${g.id}/edit`} />
      ))}
    </ListPage>
  );
}
