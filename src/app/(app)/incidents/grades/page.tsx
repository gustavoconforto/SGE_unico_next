import type { Metadata } from "next";
import { GradesIndividual } from "./views-individual";

export const metadata: Metadata = { title: "Notas de conceito" };

export default async function ConceptIndividualPage({ searchParams }: PageProps<"/incidents/grades">) {
  return <GradesIndividual kind="concept" sp={await searchParams} />;
}
