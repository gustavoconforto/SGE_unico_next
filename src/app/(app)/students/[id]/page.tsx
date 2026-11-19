import { asc, desc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { EnrollmentStatusBadge } from "@/components/enrollment-status-badge";
import { LinkButton } from "@/components/link-button";
import { WhatsAppLink } from "@/components/whatsapp-link";
import { db } from "@/db";
import {
  classesClass as klass,
  enrollmentsEnrollment as enrollment,
  enrollmentsEnrollmenttype as enrollmentType,
  enrollmentsSchoolyear as year,
  programsProgram as program,
  studentsGuardian as guardian,
  studentsGuardianassociation as link,
  studentsStudent as student,
} from "@/db/schema/app";
import { hasPermission } from "@/lib/access";
import { formatDate, label, today } from "@/lib/finance";
import { idParam } from "@/lib/list";
import { studentPhotoUrl } from "@/lib/media";
import { formatPhone } from "@/lib/person";
import { requireSession } from "@/lib/session";
import { BLOOD_TYPES, RELATIONSHIPS, STUDENT_PLACEHOLDER, ageOn, displayName } from "@/lib/students";
import { enrollmentTypeLabel, yearOf } from "../../enrollments/data";

export const metadata: Metadata = { title: "Aluno" };

const FLAGS = [
  ["isFinancial", "Responsável financeiro"],
  ["isPrimaryContact", "Contato principal"],
  ["livingWith", "Mora com o aluno"],
  ["pickUp", "Pode buscar o aluno"],
] as const;

/**
 * The student's page, for everyone who may see students (teachers included): who they are, their class and
 * situation, and who to call. Editing is a separate page, linked only for those who may edit.
 */
export default async function StudentPage({ params }: PageProps<"/students/[id]">) {
  const id = await idParam(params);
  const { user } = await requireSession();
  const [[row], guardians, enrollments, canEdit, canEnroll] = await Promise.all([
    db.select().from(student).where(eq(student.id, id)),
    db
      .select({
        id: link.id,
        name: guardian.name,
        mobile: guardian.mobile,
        phone: guardian.phone,
        relationship: link.relationship,
        isFinancial: link.isFinancial,
        isPrimaryContact: link.isPrimaryContact,
        livingWith: link.livingWith,
        pickUp: link.pickUp,
      })
      .from(link)
      .innerJoin(guardian, eq(link.guardianId, guardian.id))
      .where(eq(link.studentId, id))
      // The primary contact first: the one to call
      .orderBy(desc(link.isPrimaryContact), asc(link.id)),
    db
      .select({
        id: enrollment.id,
        status: enrollment.status,
        program: program.name,
        level: enrollmentType.level,
        schoolYear: yearOf,
        className: klass.name,
        gradeLevel: klass.gradeLevel,
      })
      .from(enrollment)
      .innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id))
      .innerJoin(program, eq(enrollmentType.programId, program.id))
      .innerJoin(year, eq(enrollmentType.schoolYearId, year.id))
      .leftJoin(klass, eq(enrollment.schoolClassId, klass.id))
      .where(eq(enrollment.studentId, id))
      .orderBy(desc(enrollment.enrolledAt), desc(enrollment.id)),
    hasPermission(user, "students.edit"),
    hasPermission(user, "enrollments.edit"),
  ]);
  if (!row) notFound();
  const name = displayName(row);
  const photo = await studentPhotoUrl(row.photo, row.registration);
  const current = enrollments[0];
  const className = (e: (typeof enrollments)[number]) => (e.className ? `${e.gradeLevel ? `${e.gradeLevel}º ` : ""}${e.className}` : null);

  return (
    <div className="flex max-w-3xl flex-col gap-4">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-center gap-4">
          {/* eslint-disable-next-line @next/next/no-img-element -- served by the authenticated /media route */}
          <img src={photo} alt={photo === STUDENT_PLACEHOLDER ? "" : `Foto de ${name}`} className="size-20 shrink-0 rounded-lg border border-gray-200 object-cover" />
          <div className="flex flex-col gap-1">
            <h1 className="text-2xl font-semibold text-balance">{name}</h1>
            {name !== row.name && <p className="text-sm text-gray-600">Nome civil: {row.name}</p>}
            <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm text-gray-700">
              <span className="tabular-nums">Matrícula {row.registration}</span>
              {current && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>{className(current) ?? "Sem turma"}</span>
                  <EnrollmentStatusBadge status={current.status} />
                </>
              )}
            </p>
          </div>
        </div>
        {(canEdit || canEnroll) && (
          <div className="flex flex-wrap gap-2">
            {canEdit && <LinkButton href={`/students/${id}/edit`}>Editar</LinkButton>}
            {canEnroll && (
              <LinkButton href={`/enrollments/new?student=${id}`} color="alternative">
                Matricular
              </LinkButton>
            )}
          </div>
        )}
      </div>

      <Section title="Responsáveis">
        {row.isSelfFinancial && <p className="text-sm text-gray-700">O próprio aluno é o responsável financeiro.</p>}
        {guardians.length ? (
          <ul className="flex flex-col divide-y divide-gray-200">
            {guardians.map((g) => {
              const flags = FLAGS.filter(([flag]) => g[flag]).map(([, text]) => text);
              return (
                <li key={g.id} className="flex flex-col gap-1 py-3 first:pt-0 last:pb-0">
                  <p>
                    <span className="font-medium text-gray-900">{g.name}</span>
                    <span className="text-gray-600"> · {label(RELATIONSHIPS, g.relationship)}</span>
                  </p>
                  {flags.length > 0 && <p className="text-sm text-gray-600">{flags.join(" · ")}</p>}
                  <div className="flex flex-wrap items-center gap-x-4">
                    <Phone value={g.mobile} />
                    <Phone value={g.phone} />
                    <WhatsAppLink phone={g.mobile} who={g.name} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">Nenhum responsável cadastrado.</p>
        )}
      </Section>

      <Section title="Dados do aluno">
        <dl className="grid gap-x-6 gap-y-3 text-sm sm:grid-cols-2">
          <Item term="Data de nascimento">{row.birthDate && `${formatDate(row.birthDate)} (${ageOn(row.birthDate, today())} anos)`}</Item>
          <Item term="Tipo sanguíneo">{row.bloodType && label(BLOOD_TYPES, row.bloodType)}</Item>
          <Item term="Celular">
            {row.mobile && (
              <span className="flex flex-wrap items-center gap-x-4">
                <Phone value={row.mobile} />
                <WhatsAppLink phone={row.mobile} who={name} />
              </span>
            )}
          </Item>
          <Item term="Telefone">{row.phone && <Phone value={row.phone} />}</Item>
          <Item term="E-mail">{row.email}</Item>
          <Item term="Escola de origem">{row.schoolFrom}</Item>
          {row.observations && (
            <div className="sm:col-span-2">
              <dt className="text-xs text-gray-600">Observações pedagógicas</dt>
              <dd className="whitespace-pre-line text-gray-900">{row.observations}</dd>
            </div>
          )}
        </dl>
      </Section>

      <Section title="Matrículas">
        {enrollments.length ? (
          <ul className="flex flex-col gap-2">
            {enrollments.map((e) => {
              const text = enrollmentTypeLabel(e.program, e.level, e.schoolYear);
              return (
                <li key={e.id} className="flex flex-wrap items-center gap-x-2 gap-y-1 text-sm">
                  {canEnroll ? (
                    <Link href={`/enrollments/${e.id}/edit`} className="font-medium text-gray-900 underline underline-offset-2 hover:text-primary-700">
                      {text}
                    </Link>
                  ) : (
                    <span className="font-medium text-gray-900">{text}</span>
                  )}
                  {className(e) && <span className="text-gray-600">· {className(e)}</span>}
                  <EnrollmentStatusBadge status={e.status} />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="text-sm text-gray-600">Nenhuma matrícula ainda.</p>
        )}
      </Section>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="flex flex-col gap-3 rounded-lg border border-gray-200 bg-white p-4 sm:p-5">
      <h2 className="text-base font-semibold text-gray-900">{title}</h2>
      {children}
    </section>
  );
}

function Item({ term, children }: { term: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs text-gray-600">{term}</dt>
      <dd className="text-gray-900">{children || <span className="text-gray-500">—</span>}</dd>
    </div>
  );
}

/** A tap-to-call phone: the hallway case is a phone in hand. */
function Phone({ value }: { value: string }) {
  if (!value) return null;
  return (
    <a href={`tel:${value.replace(/\D/g, "")}`} className="text-sm text-gray-900 tabular-nums underline-offset-2 hover:underline">
      {formatPhone(value)}
    </a>
  );
}
