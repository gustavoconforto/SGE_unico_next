import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { GradesIndividual } from "../../incidents/grades/views-individual";

export const metadata: Metadata = { title: "Nota extra" };

export default async function ExtraIndividualPage({ searchParams }: PageProps<"/pathways/extra-grades">) {
  await requirePermission("grades", "manage");
  return <GradesIndividual kind="extra" sp={await searchParams} />;
}
