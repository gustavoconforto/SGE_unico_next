import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { GradesAll } from "../views-all";

export const metadata: Metadata = { title: "Notas de conceito — todos" };

export default async function ConceptAllPage({ searchParams }: PageProps<"/incidents/grades/all">) {
  await requirePermission("grades", "manage");
  return <GradesAll kind="concept" sp={await searchParams} />;
}
