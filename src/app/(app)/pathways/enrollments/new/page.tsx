import type { Metadata } from "next";
import { param } from "@/lib/list";
import { memberFormOptions } from "../form-options";
import { MemberForm } from "../member-form";

export const metadata: Metadata = { title: "Nova inscrição" };

export default async function NewMemberPage({ searchParams }: PageProps<"/pathways/enrollments/new">) {
  const offeringId = Number(param(await searchParams, "offering")) || null;
  const options = await memberFormOptions(offeringId);
  const known = offeringId && options.offerings.some(([id]) => id === offeringId) ? offeringId : null;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova inscrição em itinerário</h1>
      <MemberForm back={known ? `/pathways/enrollments?offering=${known}` : "/pathways/enrollments"} defaults={known ? { offeringId: known } : undefined} {...options} />
    </div>
  );
}
