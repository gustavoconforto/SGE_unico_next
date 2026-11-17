import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment } from "@/db/schema/app";
import { financialGuardians } from "@/lib/finance-db";
import { param } from "@/lib/list";
import { KINDS, kindParam } from "../../kinds";
import { AccountForm } from "../account-form";
import { accountFormOptions } from "../options";

export async function generateMetadata({ params }: PageProps<"/accounts/[kind]/new">): Promise<Metadata> {
  return { title: KINDS[await kindParam(params)].newLabel };
}

export default async function NewAccountPage({ params, searchParams }: PageProps<"/accounts/[kind]/new">) {
  const kind = await kindParam(params);
  const options = await accountFormOptions(kind);
  // "Nova conta a receber" on the enrollment page: ?enrollment=<id> prefills the student and payer
  const enrollmentId = kind === "receivable" ? Number(param(await searchParams, "enrollment")) || null : null;
  const [source] = enrollmentId ? await db.select({ id: enrollment.id, studentId: enrollment.studentId }).from(enrollment).where(eq(enrollment.id, enrollmentId)) : [];
  const [payer] = source ? await financialGuardians(db, source.studentId).limit(1) : [];
  const back = source ? `/enrollments/${source.id}/edit` : `/accounts/${kind}`;
  return (
    <div className="flex flex-col gap-4">
      <h1 className="text-2xl font-semibold">{KINDS[kind].newLabel}</h1>
      <AccountForm kind={kind} options={options} defaults={source ? { studentId: source.studentId, guardianId: payer?.id ?? "" } : undefined} cancelHref={back} />
    </div>
  );
}
