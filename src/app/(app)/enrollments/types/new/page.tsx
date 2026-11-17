import type { Metadata } from "next";
import { programOptions, yearOptions } from "../../../classes/options";
import { EnrollmentTypeForm } from "../enrollment-type-form";

export const metadata: Metadata = { title: "Novo contrato" };

export default async function NewEnrollmentTypePage() {
  const [programs, years] = await Promise.all([programOptions(), yearOptions()]);
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">Novo contrato</h1>
      <EnrollmentTypeForm programs={programs} years={years} />
    </div>
  );
}
