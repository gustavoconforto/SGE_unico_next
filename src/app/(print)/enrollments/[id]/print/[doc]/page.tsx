import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { attendanceFields } from "@/lib/enrollment-report";
import { today } from "@/lib/finance";
import { idParam } from "@/lib/list";
import { PrintToolbar } from "../../../../print-toolbar";
import { Paragraphs } from "../paragraphs";
import { ExamRequestForm, ExamRequestProvider } from "./exam-request-form";
import { GuardianVisitForm, GuardianVisitProvider } from "./guardian-visit-form";
import { AttendanceBody, AttendanceForm, AttendanceProvider } from "./attendance-form";
import {
  ComparecimentoResponsavel,
  Contract,
  Declaracao,
  Ficha,
  PasseEstudantil,
  ProvaSubstitutiva,
  Requerimento,
  Transferencia,
} from "../documents";
import { declarationParagraphs, examSubjects, loadEnrollmentReport, studentFacts } from "../report";

// slug in the URL -> title (Django's PRINT_DOCUMENTS)
const DOCUMENTS: Record<string, string> = {
  contrato: "Contrato de Prestação de Serviços Educacionais",
  requerimento: "Requerimento de Matrícula",
  ficha: "Ficha de Matrícula",
  declaracao: "Declaração de Escolaridade",
  comparecimento: "Declaração de Comparecimento",
  substitutiva: "Requerimento de Prova Substitutiva",
  passe: "Declaração de Passe Estudantil",
  transferencia: "Declaração de Transferência",
  "comparecimento-responsavel": "Declaração de Comparecimento",
};

export async function generateMetadata({ params }: PageProps<"/enrollments/[id]/print/[doc]">): Promise<Metadata> {
  return { title: DOCUMENTS[(await params).doc] ?? "Matrícula" };
}

/** Django redirects back with a flash message; here the message shows in place of the document, with the way to fix it. */
function Missing({ id, studentId, message }: { id: number; studentId: number; message: string }) {
  return (
    <main className="mx-auto my-10 flex max-w-xl flex-col gap-4 rounded-lg bg-white p-6 shadow-md">
      <p className="flex gap-2 text-gray-900">
        <span className="material-symbols-outlined text-gray-500" aria-hidden="true">
          info
        </span>
        {message}
      </p>
      <div className="flex flex-wrap gap-2">
        <LinkButton href={`/students/${studentId}/edit`}>Cadastrar responsáveis</LinkButton>
        <LinkButton href={`/enrollments/${id}/edit`} color="alternative">
          Voltar para a matrícula
        </LinkButton>
      </div>
    </main>
  );
}

export default async function EnrollmentPrintPage({ params }: PageProps<"/enrollments/[id]/print/[doc]">) {
  await requirePermission("enrollments", "view");
  const { doc } = await params;
  if (!(doc in DOCUMENTS)) notFound();
  const id = await idParam(params);
  const r = await loadEnrollmentReport(id);
  if (!r) notFound();

  // The secretaria signs the declaração, so it needs no payer; it certifies a current enrollment (the menu says so)
  if (doc === "declaracao") {
    if (r.enrollment.status !== "A") notFound();
    return (
      <>
        <PrintToolbar>
          <a
            href={`/enrollments/${id}/print/declaracao/docx`}
            className="rounded-md bg-gray-600 px-4 py-2 text-sm font-semibold text-white"
          >
            Baixar Word
          </a>
        </PrintToolbar>
        <Declaracao title={DOCUMENTS.declaracao}>
          <Paragraphs paragraphs={declarationParagraphs(r)} />
        </Declaracao>
      </>
    );
  }

  // The secretaria fills in the event, date, shift and hours in the toolbar; the text follows in the browser
  if (doc === "comparecimento") {
    if (r.enrollment.status !== "A") notFound();
    const initial = attendanceFields(() => null, { date: today(), shift: r.schoolClass?.shift });
    return (
      <AttendanceProvider facts={studentFacts(r)} initial={initial}>
        <PrintToolbar>
          <AttendanceForm docx={`/enrollments/${id}/print/comparecimento/docx`} />
        </PrintToolbar>
        <Declaracao title={DOCUMENTS.comparecimento}>
          <AttendanceBody />
        </Declaracao>
      </AttendanceProvider>
    );
  }

  // The student (or a guardian) signs the request; the secretaria fills in the blanks in the toolbar
  if (doc === "substitutiva") {
    if (r.enrollment.status !== "A") notFound();
    return (
      <ExamRequestProvider>
        <PrintToolbar>
          <ExamRequestForm subjects={await examSubjects(r)} />
        </PrintToolbar>
        <ProvaSubstitutiva r={r} />
      </ExamRequestProvider>
    );
  }

  if (doc === "passe") {
    if (r.enrollment.status !== "A" || !r.schoolClass) notFound();
    return (
      <>
        <PrintToolbar />
        <PasseEstudantil r={r} title={DOCUMENTS.passe} />
      </>
    );
  }

  if (doc === "comparecimento-responsavel") {
    if (r.enrollment.status !== "A") notFound();
    return (
      <GuardianVisitProvider date={today()}>
        <PrintToolbar>
          <GuardianVisitForm />
        </PrintToolbar>
        <ComparecimentoResponsavel r={r} title={DOCUMENTS["comparecimento-responsavel"]} />
      </GuardianVisitProvider>
    );
  }

  if (doc === "transferencia") {
    if (!["A", "T"].includes(r.enrollment.status)) notFound();
    return (
      <>
        <PrintToolbar />
        <Transferencia r={r} title={DOCUMENTS.transferencia} />
      </>
    );
  }

  if (!r.payer)
    return (
      <Missing
        id={id}
        studentId={r.student.id}
        message="O aluno não possui responsável financeiro cadastrado; cadastre-o antes de gerar o documento."
      />
    );
  // The ficha must certify both parents, as the law requires
  if (doc === "ficha" && !(r.father && r.mother))
    return (
      <Missing
        id={id}
        studentId={r.student.id}
        message="Cadastre o pai e a mãe do aluno como responsáveis antes de gerar a ficha de matrícula."
      />
    );

  return (
    <>
      <PrintToolbar />
      {doc === "contrato" && <Contract r={r} payer={r.payer} />}
      {doc === "requerimento" && <Requerimento r={r} payer={r.payer} />}
      {doc === "ficha" && r.father && r.mother && <Ficha r={r} payer={r.payer} father={r.father} mother={r.mother} />}
    </>
  );
}
