import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { CategoryForm } from "../category-form";

export const metadata: Metadata = { title: "Nova categoria" };

export default async function NewCategoryPage() {
  await requirePermission("finance", "edit");
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Nova categoria financeira</h1>
      <CategoryForm />
    </div>
  );
}
