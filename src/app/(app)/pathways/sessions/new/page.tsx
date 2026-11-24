import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { param } from "@/lib/list";
import { offeringOptions } from "../../data";
import { SessionForm } from "../session-form";

export const metadata: Metadata = { title: "Nova aula" };

export default async function NewSessionPage({ searchParams }: PageProps<"/pathways/sessions/new">) {
  await requirePermission("pathways", "edit");
  const offerings = await offeringOptions();
  const id = Number(param(await searchParams, "offering")) || null;
  const known = offerings.some((o) => o.id === id) ? id : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova aula</h1>
      <SessionForm
        back={known ? `/pathways/sessions?offering=${known}` : "/pathways/sessions"}
        defaults={known ? { offeringId: known } : undefined}
        offerings={offerings.map((o) => [o.id, o.label])}
      />
    </div>
  );
}
