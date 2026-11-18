import type { Metadata } from "next";
import { roleOptions } from "../../employees/roles";
import { GroupForm } from "../group-form";

export const metadata: Metadata = { title: "Novo grupo" };

export default async function NewGroupPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo grupo</h1>
      <GroupForm roles={await roleOptions()} />
    </div>
  );
}
