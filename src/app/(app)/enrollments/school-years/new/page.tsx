import type { Metadata } from "next";
import { SchoolYearForm } from "../school-year-form";

export const metadata: Metadata = { title: "Novo ano escolar" };

export default function NewSchoolYearPage() {
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo ano escolar</h1>
      <SchoolYearForm />
    </div>
  );
}
