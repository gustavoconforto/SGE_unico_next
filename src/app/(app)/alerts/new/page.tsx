import type { Metadata } from "next";
import { requirePermission } from "@/lib/authorization";
import { classOptions } from "../../enrollments/data";
import { AlertForm } from "../alert-form";

export const metadata: Metadata = { title: "Novo aviso" };

// createAlert pushes to every guardian's phone in after(), which runs within this page's time limit
export const maxDuration = 60;

export default async function NewAlertPage() {
  await requirePermission("alerts", "edit");
  const classes = await classOptions();
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo aviso aos responsáveis</h1>
      <AlertForm classes={classes.map((c) => [c.id, c.label])} />
    </div>
  );
}
