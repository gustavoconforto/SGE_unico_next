import { requirePermission } from "@/lib/authorization";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { LinkButton } from "@/components/link-button";
import { idParam } from "@/lib/list";
import { PrintToolbar } from "../../../../print-toolbar";
import { Contract, Ficha, Requerimento } from "../documents";
import { loadEnrollmentReport } from "../report";

// slug in the URL -> title (Django's PRINT_DOCUMENTS)
const DOCUMENTS: Record<string, string> = {
  contrato: "Contrato de Prestação de Serviços Educacionais",
  requerimento: "Requerimento de Matrícula",
  ficha: "Ficha de Matrícula",
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

  if (!r.payer) return <Missing id={id} studentId={r.student.id} message="O aluno não possui responsável financeiro cadastrado; cadastre-o antes de gerar o documento." />;
  // The ficha must certify both parents, as the law requires
  if (doc === "ficha" && !(r.father && r.mother))
    return <Missing id={id} studentId={r.student.id} message="Cadastre o pai e a mãe do aluno como responsáveis antes de gerar a ficha de matrícula." />;

  return (
    <>
      <PrintToolbar />
      {doc === "contrato" && <Contract r={r} payer={r.payer} />}
      {doc === "requerimento" && <Requerimento r={r} payer={r.payer} />}
      {doc === "ficha" && r.father && r.mother && <Ficha r={r} payer={r.payer} father={r.father} mother={r.mother} />}
    </>
  );
}
