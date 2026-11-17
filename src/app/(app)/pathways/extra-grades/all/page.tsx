import type { Metadata } from "next";
import { GradesAll } from "../../../incidents/grades/views-all";

export const metadata: Metadata = { title: "Nota extra — todos" };

export default async function ExtraAllPage({ searchParams }: PageProps<"/pathways/extra-grades/all">) {
  return <GradesAll kind="extra" sp={await searchParams} />;
}
