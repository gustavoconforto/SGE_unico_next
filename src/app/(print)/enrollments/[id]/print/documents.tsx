/* eslint-disable @next/next/no-img-element -- print pages */
import { enrollmentTypeLabel } from "@/app/(app)/enrollments/data";
import { SHIFT_PERIODS, fullAddress, longDate } from "@/lib/enrollment-report";
import { formatDate, formatMoney, label, today } from "@/lib/finance";
import { formatDocument, formatZipCode } from "@/lib/format";
import { SEX_CHOICES, formatPhone } from "@/lib/person";
import { ExamBlank } from "./[doc]/exam-request-form";
import type { EnrollmentReport, Person } from "./report";

// Ported from Django's print_base.html / preview_enrollment.html styles, scoped to .enr
const BASE_CSS = `
@page { size: A4; margin: 14mm; }
.enr { max-width: 210mm; margin: 24px auto; padding: 16mm; background: #fff; box-shadow: 0 2px 12px rgba(0,0,0,.15);
  color: #111827; font-family: Arial, Helvetica, sans-serif; font-size: 11pt; line-height: 1.4; }
.enr .logo { height: 64px; width: auto; }
.enr h1 { margin: 0; font-size: 16pt; font-weight: bold; text-align: center; text-transform: uppercase; }
.enr .signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-top: 64px; text-align: center; }
.enr .signatures .line { padding-top: 6px; border-top: 1px solid #111827; }
.enr .no-break { break-inside: avoid; }
@media (max-width: 640px) { .enr { margin: 0; padding: 20px 16px; } .enr .signatures { grid-template-columns: 1fr; } }
@media print { .enr { max-width: none; margin: 0; padding: 0; box-shadow: none; } }
`;

const FICHA_CSS = `
.enr header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; margin-bottom: 12px; }
.enr header h1 { text-align: left; margin-bottom: 8px; }
.enr header p { margin: 2px 0; }
.enr h2 { margin: 14px 0 4px; font-size: 11pt; font-weight: bold; text-transform: uppercase; }
.enr .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 4px 16px; font-size: 10pt; }
.enr .person .grid { grid-template-columns: repeat(2, 1fr); }
.enr .grid .wide { grid-column: 1 / -1; }
.enr .documents { margin-top: 16px; padding: 8px 12px; border: 1px solid #111827; font-size: 10pt; }
.enr .documents h2 { margin-top: 4px; }
.enr .documents ul { margin: 0 0 8px; padding-left: 18px; list-style: disc; text-transform: uppercase; }
.enr .declaration { margin-top: 16px; font-size: 10pt; }
`;

const REQUERIMENTO_CSS = `
.enr .logo-row { text-align: right; }
.enr .logo-row img { display: inline-block; }
.enr h1 { margin: 32px 0 40px; }
.enr .date { text-align: right; }
.enr .salutation { margin: 56px 0 32px; }
.enr .body p { text-align: justify; line-height: 2; margin-bottom: 1em; }
/* One-page document: fill the A4 sheet and push the signatures to its foot */
.enr { display: flex; flex-direction: column; min-height: 297mm; }
.enr .signatures { margin-top: auto; padding-top: 64px; }
/* 297mm - 2 x 14mm @page margin, minus 2mm so rounding never spills a blank second page */
@media print { .enr { min-height: 267mm; } }
`;

const CONTRACT_CSS = `
@page { size: A4; margin: 18mm 16mm; }
.enr.contract-page { padding: 20mm 18mm; font-family: "Times New Roman", Times, serif; font-size: 12pt; line-height: 1.45; }
.enr .letterhead { display: flex; justify-content: space-between; align-items: center; gap: 16px; padding-bottom: 12px; margin-bottom: 20px; border-bottom: 2px solid #111827; }
.enr .letterhead .school { margin: 0; font-size: 16pt; font-weight: bold; letter-spacing: 1px; }
.enr .letterhead p { margin: 2px 0; font-size: 10pt; }
.enr h1 { margin: 0 0 16px; font-size: 14pt; }
.enr h2 { margin: 0; padding: 6px 8px; background: #f3f4f6; border: 1px solid #9ca3af; text-align: center; font-size: 11pt; font-weight: bold; text-transform: uppercase; }
.enr .info-table { width: 100%; margin-bottom: 12px; border-collapse: collapse; font-size: 10.5pt; }
.enr .info-table th, .enr .info-table td { padding: 4px 8px; border: 1px solid #9ca3af; text-align: left; vertical-align: top; }
.enr .info-table th { width: 110px; background: #f9fafb; white-space: nowrap; }
.enr .info-table .group { background: #e5e7eb; text-align: center; text-transform: uppercase; }
.enr .notice { margin: 0 0 20px; font-size: 9.5pt; font-style: italic; text-align: justify; }
.enr .contract p { margin: 0 0 8px; text-align: justify; }
.enr .contract .clause { margin-top: 14px; }
.enr .contract ol { margin: 0 0 8px; padding-left: 28px; text-align: justify; }
.enr .contract li { margin-bottom: 4px; }
.enr .roman { list-style: upper-roman; }
.enr .alpha { list-style: lower-alpha; }
.enr .price-table { width: 100%; margin: 8px 0 12px; border-collapse: collapse; font-size: 10.5pt; }
.enr .price-table th, .enr .price-table td { padding: 6px 8px; border: 1px solid #9ca3af; text-align: center; }
.enr .price-table th { background: #f3f4f6; }
.enr .date { margin: 24px 0 48px; text-align: right; }
.enr .contract-signatures { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; margin-bottom: 40px; text-align: center; }
.enr .signature .line { border-top: 1px solid #111827; margin-bottom: 4px; padding-top: 4px; font-weight: bold; }
.enr .signature small { display: block; font-size: 10pt; }
.enr .witnesses { display: grid; grid-template-columns: 1fr 1fr; gap: 48px; }
.enr .witnesses p { margin: 0 0 16px; }
.enr .blank { display: inline-block; width: calc(100% - 48px); border-bottom: 1px solid #111827; }
@media (max-width: 640px) { .enr .contract-signatures, .enr .witnesses { grid-template-columns: 1fr; } .enr .price-table { font-size: 9pt; } }
`;

const DECLARATION_CSS = `
.enr.declaration-page { display: flex; flex-direction: column; min-height: 297mm; font-size: 12pt; }
/* The paper model's letterhead is Consolas (slashed zeros): one centered block per line, wrapping naturally */
.enr .heading { text-align: center; font-family: Consolas, Menlo, "DejaVu Sans Mono", monospace; font-size: 7pt; line-height: 1.25; }
.enr .heading img { display: block; margin: 0 auto 24px; }
.enr .heading p { margin: 0; }
.enr h1 { margin: 56px 0 64px; font-size: 14pt; }
.enr .body p { margin: 0; text-align: justify; text-indent: 2.5em; line-height: 2; }
.enr .date { margin: 56px 0 0; text-align: right; }
.enr .signature { width: 60%; margin: 88px auto 0; padding-top: 4px; border-top: 1px solid #111827; text-align: center; }
.enr footer { margin-top: auto; padding-top: 6px; border-top: 2px solid #4b5563; text-align: center; font-size: 9pt; color: #4b5563; }
.enr footer p { margin: 0; }
.enr.no-footer footer { display: none; }
.enr.transfer .signature { margin-top: auto; }
@media print { .enr.declaration-page { min-height: 267mm; } }
`;

const EXAM_REQUEST_CSS = `
.enr.exam-request { font-size: 11pt; }
.enr .logo-row { text-align: center; }
.enr .logo-row img { display: inline-block; }
.enr h1 { margin: 16px 0 32px; font-size: 13pt; }
.enr .exam-request-body { margin: 0; text-align: justify; line-height: 1.8; }
.enr dl { display: grid; grid-template-columns: 1fr 1fr; gap: 18px 24px; margin: 0; }
.enr dl div { display: flex; gap: 6px; }
.enr dl .wide { grid-column: 1 / -1; }
.enr dt { font-weight: bold; text-transform: uppercase; }
.enr dd { margin: 0; }
.enr .exam { margin: 28px 0 0; }
.enr .date { margin: 28px 0 0; text-align: right; }
.enr .signature { width: 60%; margin: 64px auto 0; padding-top: 4px; border-top: 1px solid #111827; text-align: center; font-size: 10pt; }
.enr .cut { margin: 32px 0; border: 0; border-top: 1px dashed #111827; }
`;

/** The declaração's letterhead and footer, as on the secretaria's paper model (also in the .docx). */
export const DECLARATION_HEADING = [
  "SGAS 606 BLOCO F PARTE A, ASA SUL - Brasília DISTRITO FEDERAL - CEP 70200-660",
  "Mantenedora: Único Educacional JAM e M de Ensino Ltda",
  "Portaria de Recredenciamento nº 1.202, de 16 de dezembro de 2022 - SEDF, DODF nº 233, de 19 de dezembro de 2022. " +
    "Fundamentação Legal: Lei nº 9394/96, Resolução nº 01/2020 CEDF. Parecer nº 240/2022-CEDF de 29 de novembro de 2022.",
];
export const DECLARATION_FOOTER = ["ASA SUL", "End: SGAS II St. de Grandes Áreas Sul 606"];

const LOGO = "/img/unico_logo_stamp.png";
const upper = (s: string | null | undefined) => (s ?? "").toUpperCase();
const phones = (p: { mobile: string; phone: string }) =>
  [formatPhone(p.mobile), formatPhone(p.phone)].filter(Boolean).join(" / ");
/** The contract's address line, unconditional as in Django. */
const contractAddress = (p: Person) => `${p.address}, ${p.neighborhood}, ${p.city} - ${p.state}`;

/** print_base.html: the page and its two signatures. */
function PrintPage({ css, payer, children }: { css: string; payer: Person; children: React.ReactNode }) {
  return (
    <main className="enr">
      <style>{BASE_CSS + css}</style>
      {children}
      <div className="signatures no-break">
        <div>
          <div className="line">{payer.name}</div>
          <small>Responsável</small>
        </div>
        <div>
          <div className="line">ÚNICO EDUCACIONAL</div>
        </div>
      </div>
    </main>
  );
}

/** partials/print_person.html */
function PersonSection({ title, person }: { title: string; person: Person }) {
  return (
    <section className="person no-break">
      <h2>
        {title}: {upper(person.name)}
      </h2>
      <div className="grid">
        <div>
          <b>CPF:</b> {formatDocument(person.cpf)}
        </div>
        <div>
          <b>RG - Órgão Expedidor:</b> {person.rg} {person.issuingAuthority}
        </div>
        <div className="wide">
          <b>Endereço:</b> {fullAddress(person)}
        </div>
        <div>
          <b>Contatos:</b> {phones(person)}
        </div>
        <div>
          <b>E-mail:</b> {person.email}
        </div>
      </div>
    </section>
  );
}

export function Ficha({
  r,
  payer,
  father,
  mother,
}: {
  r: EnrollmentReport;
  payer: Person;
  father: Person;
  mother: Person;
}) {
  const s = r.student;
  return (
    <PrintPage css={FICHA_CSS} payer={payer}>
      <header>
        <div>
          <h1>Ficha de Matrícula</h1>
          <p>
            <b>Nome:</b> {upper(s.name)}
          </p>
          {s.socialName && (
            <p>
              <b>Nome social:</b> {upper(s.socialName)}
            </p>
          )}
          <p>
            <b>Matrícula:</b> {s.registration}
          </p>
          <p>
            <b>Série:</b> {r.grade}ª Série{r.schoolClass && ` - Turma ${upper(r.schoolClass.name)}`}
          </p>
        </div>
        <img className="logo" src={LOGO} alt="Único Educacional" />
      </header>
      <section className="no-break">
        <h2>Aluno(a)</h2>
        <div className="grid">
          <div>
            <b>Período letivo:</b> {r.schoolYear}
          </div>
          <div>
            <b>Unidade:</b> ÚNICO EDUCACIONAL
          </div>
          <div>
            <b>Curso:</b> {upper(r.program)}
          </div>
          <div>
            <b>CPF:</b> {formatDocument(s.cpf)}
          </div>
          <div>
            <b>RG - Órgão Expedidor:</b> {s.rg} {s.issuingAuthority}
          </div>
          <div>
            <b>Naturalidade:</b> {s.placeOfBirth}
          </div>
          <div>
            <b>Sexo:</b> {label(SEX_CHOICES, s.sex)}
          </div>
          <div>
            <b>Data de nascimento:</b> {formatDate(s.birthDate)}
          </div>
          <div>
            <b>Tipo sanguíneo:</b> {s.bloodType}
          </div>
          <div className="wide">
            <b>Endereço:</b> {fullAddress(s)}
          </div>
          <div>
            <b>Telefone:</b> {phones(s)}
          </div>
          <div className="wide">
            <b>E-mail:</b> {s.email}
          </div>
        </div>
      </section>
      <PersonSection title="Financeiro" person={payer} />
      <PersonSection title="Pai" person={father} />
      <PersonSection title="Mãe" person={mother} />
      <section className="documents no-break">
        <h2>Documentos entregues:</h2>
        <ul>{r.delivered.length ? r.delivered.map((d) => <li key={d}>{d}</li>) : <li>Nenhum</li>}</ul>
        <h2>Documentos pendentes:</h2>
        <ul>{r.pending.length ? r.pending.map((d) => <li key={d}>{d}</li>) : <li>Nenhum</li>}</ul>
      </section>
      <p className="declaration">Declaro que as informações supracitadas são verdadeiras.</p>
      <p className="declaration">Brasília, {longDate(r.enrollment.enrolledAt)}.</p>
    </PrintPage>
  );
}

export function Requerimento({ r, payer }: { r: EnrollmentReport; payer: Person }) {
  const period = r.schoolClass ? SHIFT_PERIODS[r.schoolClass.shift] : undefined;
  return (
    <PrintPage css={REQUERIMENTO_CSS} payer={payer}>
      <div className="logo-row">
        <img className="logo" src={LOGO} alt="Único Educacional" />
      </div>
      <h1>Requerimento de Matrícula</h1>
      <p className="date">Brasília, {longDate(r.enrollment.enrolledAt)}</p>
      <p className="salutation">Exmo. Sr. Diretor.</p>
      <div className="body">
        <p>
          Eu, {upper(payer.name)}, CPF: {formatDocument(payer.cpf)}, RG {payer.rg} {payer.issuingAuthority}, responsável
          pelo(a) aluno(a): {upper(r.student.name)}, declaro estar de acordo com o Contrato de Prestação de Serviços
          Educacionais e com as disposições do Regimento Escolar e solicito a V.Sa. a matrícula da(o) referida(o)
          aluna(o) na {r.grade}ª Série do {upper(r.program)}
          {period && `, no período ${upper(period)}`}, no ano letivo de {r.schoolYear}.
        </p>
        <p>
          Dessa forma o ÚNICO EDUCACIONAL se obriga a reservar uma vaga para esse (a) aluno (a) e eu me obrigo a cumprir
          todas as cláusulas contratuais.
        </p>
      </div>
    </PrintPage>
  );
}

export function Contract({ r, payer }: { r: EnrollmentReport; payer: Person }) {
  const s = r.student;
  const year = r.schoolYear;
  const count = r.installments.length;
  return (
    <main className="enr contract-page">
      <style>{BASE_CSS + CONTRACT_CSS}</style>
      <header className="letterhead">
        <div>
          <p className="school">ÚNICO EDUCACIONAL</p>
          <p>SGAS 606 BLOCO F PARTE A ASA SUL - Brasília - DF CEP:70200-660</p>
          <p>Telefone: (61)3244-0910</p>
        </div>
        <img className="logo" src={LOGO} alt="Único Educacional" />
      </header>
      <h1>Contrato de Prestação de Serviços Educacionais</h1>
      <section className="no-break">
        <h2>Quadro de Informações do Contrato – Único Educacional</h2>
        <table className="info-table">
          <tbody>
            <tr>
              <th colSpan={2} className="group">
                Aluno (a)
              </th>
            </tr>
            <tr>
              <th>SÉRIE:</th>
              <td>
                {r.grade}ª Série - {year}
              </td>
            </tr>
            <tr>
              <th>NOME:</th>
              <td>{s.name}</td>
            </tr>
            <tr>
              <th>CPF:</th>
              <td>{formatDocument(s.cpf)}</td>
            </tr>
            <tr>
              <th>ENDEREÇO:</th>
              <td>{contractAddress(s)}</td>
            </tr>
            <tr>
              <th>CEP:</th>
              <td>{s.zipCode && formatZipCode(s.zipCode)}</td>
            </tr>
            <tr>
              <th>TELEFONE:</th>
              <td>{formatPhone(s.mobile)}</td>
            </tr>
            <tr>
              <th colSpan={2} className="group">
                Contratante
              </th>
            </tr>
            <tr>
              <th>NOME:</th>
              <td>{payer.name}</td>
            </tr>
            <tr>
              <th>CPF:</th>
              <td>{formatDocument(payer.cpf)}</td>
            </tr>
            <tr>
              <th>ENDEREÇO:</th>
              <td>{contractAddress(payer)}</td>
            </tr>
            <tr>
              <th>TELEFONE:</th>
              <td>{formatPhone(payer.mobile)}</td>
            </tr>
            <tr>
              <th>E-MAIL:</th>
              <td>{payer.email}</td>
            </tr>
          </tbody>
        </table>
        <p className="notice">
          “Todas as informações deste quadro são preservadas de acordo com a legislação vigente e conforme o uso de que
          o fornecedor de serviços precisa, sem prejuízo ao consumidor, inclusive no que for de regulação obrigatória
          pela Lei Geral de Proteção de Dados Pessoais – Lei Federal 13.709 de 2018”.
        </p>
      </section>
      <article className="contract">
        <p>
          O(A) CONTRATANTE, assinado e identificado no quadro de informações do contrato, em benefício do ALUNO, também
          identificado no quadro de informações, e como CONTRATADA: ÚNICO EDUCACIONAL JAM E M DE ENSINO LTDA, pessoa
          jurídica de direito, com sede na SGAS 606 BLOCO F PARTE A ASA SUL - Brasília - DF - CEP:70200-660, CNPJ Nº:
          34.270.139/0001-77, entidade mantenedora do ÚNICO EDUCACIONAL, neste ato representada pelo seu DIRETOR ou
          SECRETÁRIA ESCOLAR, pactuam:
        </p>

        <p className="clause">
          <strong>Cláusula Primeira:</strong> O OBJETO deste Contrato é a prestação de serviços de ensino regular,
          somente para o ano letivo de {year}, pelo ÚNICO EDUCACIONAL, recredenciado na Secretaria de Estado de Educação
          do Distrito Federal, ao(à) indicado(a) pelo(a) CONTRATANTE. Conforme disposto no seu Regimento Escolar e em
          sua Proposta Pedagógica , que passam a integrar este Contrato.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - O presente contrato não abrange, de forma alguma, atos de transporte de
          alunos, guarda de bens, de veículos, de hospedagem, de vigilância, de saúde, de alimentação e outros que não
          sejam exclusivamente serviços de Educação Básica, com qualquer outro serviço devendo ser expressamente
          previsto em contrato entre as partes.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - O Regime Disciplinar e demais instruções específicas da Instituição,
          foram expostas pela equipe de Orientação, estão disponíveis na secretaria da Instituição e passam a fazer
          parte do presente Contrato, submetendo-se o (a) CONTRATANTE e o (a) Aluno(a) às suas disposições, bem como das
          demais obrigações decorrentes da legislação aplicável à área de ensino, ficando desde já estabelecido que:
        </p>
        <ol className="roman">
          <li>
            A escola pode apurar e tratar as faltas disciplinares que aconteçam no seu interior, exterior (inclusive
            internet) e mediações do estabelecimento de ensino e que traga repercussão direta ou indireta à CONTRATADA,
            conforme o estabelecido no regimento interno, que faz parte integrante deste contrato;
          </li>
          <li>
            As sanções guardarão proporção com o ato praticado, sem necessidade de gradação, devendo ser observado,
            conforme a gravidade, o contraditório e a ampla defesa, podendo ser aplicada: a) advertência verbal ou
            escrita; b) suspensão de atividades com o aluno, dentro e fora da escola; c) transferência compulsória; d)
            perda de benefícios contratuais como bolsas e descontos; e) a proibição de rematrícula (por um ou mais anos
            letivos).
          </li>
          <li>
            Para fins de segurança, inclusive de disciplina/comportamento e proteção aos direitos de todos, a escola
            poderá se valer, pontualmente ou não, de aparelhos (de imagem e/ou sons e/ou movimentação na internet) e/ou
            procedimentos de fiscalização aleatória, para acompanhar fatos em qualquer lugar da escola, inclusive salas
            de aula, mas não em espaços íntimos internos de banheiros.
          </li>
          <li>
            Nas hipóteses de atividades executadas fora da sede da instituição, permanecem aplicáveis todas as regras
            regimentais de comportamento, acrescida, a critério do responsável pelo evento externo, de medidas voltadas
            à segurança dos discentes e bom andamento dos trabalhos, podendo, por decisão da coordenação, ser aplicada
            como penalidade o retorno do aluno ao seu domicílio, devendo arcar os responsáveis com eventual custo de
            acompanhamento se necessário, sem prejuízo das demais regulamentações formais decorrentes de circulares,
            reuniões e documentos idôneos que disciplinem a conduta das partes nesses eventos.
          </li>
        </ol>
        <p>
          <strong>Parágrafo Terceiro</strong> - Conquanto seja o curso presencial, fica desde já acordado que o presente
          acerto se submete à cláusula <em>rebus sic stantibus</em>, o que permite, caso haja uma orientação
          governamental a revisão das estratégias de contingenciamento para combate e prevenção a pandemias como a
          proveniente do Coronavírus. Com efeito, uma, ou algumas das medidas adiante listadas poderão ser adotadas,
          para proteger o estudante, além de outras que visem recompor o equilíbrio e a exequibilidade do contrato:
        </p>
        <ol className="alpha">
          <li>
            Conversão do período restante de aulas presenciais em aulas por intermédio de meios telemáticos de
            comunicação;
          </li>
          <li>
            Adoção de sistema misto, com matérias presenciais e outras remotas, conforme orientação técnica de livre
            definição do corpo docente.
          </li>
        </ol>
        <p>
          <strong>Parágrafo Quarto</strong> – Sempre que houver autorização normativa para adoção de sistema de ensino à
          distância – EAD, faculta-se A CONTRATADA converter o sistema presencial em EAD na proporção permitida pela
          norma, sem prejuizo dos valores ora pactuados no presente instrumento.
        </p>

        <p className="clause">
          <strong>Cláusula Segunda:</strong> O ÚNICO EDUCACIONAL assegura ao(à) aluno(a) uma vaga no seu corpo discente,
          a ser utilizada na série, curso e turno para o ano letivo de {year}, tudo constante do Requerimento de
          Matrícula, que também passa a integrar este Contrato.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - O(A) CONTRATANTE assume total responsabilidade pela fidelidade das
          informações constantes no Requerimento de Matrícula e Obriga-se o(a) a manter o ÚNICO EDUCACIONAL devidamente
          informado dos endereços residencial e eletrônico, bem como dos telefones pessoais e profissionais, informando
          qualquer alteração em um prazo de 30 (trinta) dias.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - O(A) CONTRATANTE deverá expor por escrito, no ato da matrícula, a
          necessidade de qualquer tipo de atendimento especial para o (a) aluno(a) e caberá a CONTRATADA providenciar as
          medidas necessárias para o atendimento adequado.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> - A efetivação da matrícula relativa à vaga reservada no caput desta
          cláusula pressupõe a satisfação dos seguintes critérios: a) quitação das obrigações contratuais relativas ao
          ano letivo antecedente, caso já seja aluno da contratada, inclusive cumprimento de acordo de parcelamento de
          débitos nas datas aprazadas; b) cumprimento de todas as obrigações de fazer decorrentes do contrato, como
          entrega de documentos pessoais, histórico escolar e/ou declaração equivalente se egresso de outra instituição
          de ensino, c) outros requisitos que a critério da escola sejam condição imprescindivel para a efetivação da
          matrícula, desde que impessoais e objetivos. Caso haja o descumprimeito dos critérios acima apresentados e
          o(a) beneficiário(a) do Contrato cometa ações contrárias as previstas no Regimento Escolar ou nas Leis
          Federais e Distritais, o presente Contrato poderá ser rescindido por iniciativa da CONTRATADA, isentando a
          mesma de qualquer responsabilidade pelos eventuais danos resultantes.
        </p>
        <p>
          <strong>Parágrafo Quarto</strong> - Na hipótese de emissão de termo de quitação decorrente de acordo junto à
          CONTRATADA, o descumprimento de quaisquer das cláusulas acordadas antes do início do ano letivo de {year}{" "}
          acarretará o rompimento contratual por culpa do(a) CONTRATANTE, incidindo multa de 10% sobre o valor acordado.
          Caso o descumprimento ocorra após o início do ano letivo de {year}, a contratada se reserva o direito de não
          renovar a matricula no ano letivo seguinte, mesmo com outro responsável financeiro ou CONTRATANTE, exceto se
          houver o pagamento à vista dos valores em aberto até o fim do ano letivo de {year}, inclusive com as
          mensalidades deste.
        </p>

        <p className="clause">
          <strong>Cláusula Terceira:</strong> Como contraprestação pelos Serviços Educacionais a serem prestados por
          força do presente contrato, o(a) CONTRATANTE aceita pagar os valores propostos pela CONTRATADA para o ano
          letivo de {year}, a serem pagos de acordo com o plano de valores vigente na data da matrícula, apresentado no
          quadro abaixo:
        </p>
        <p>
          <strong>Curso:</strong> {enrollmentTypeLabel(r.program, r.level, year)}
        </p>
        <table className="price-table no-break">
          <thead>
            <tr>
              <th>Parcela</th>
              <th>Vencimento</th>
              <th>Valor</th>
            </tr>
          </thead>
          <tbody>
            {r.installments.map((i) => (
              <tr key={i.id}>
                <td>
                  {i.number}/{count}
                </td>
                <td>{formatDate(i.dueDate)}</td>
                <td>R$ {formatMoney(i.amount)}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {r.discountPercent && !r.discountPercent.isZero() && r.discountAmount && (
          <p>
            <strong>
              Desconto concedido: percentual aproximado de {formatMoney(r.discountPercent)}%, no valor exato de (R${" "}
              {formatMoney(r.discountAmount)}) e com vigência no período letivo de {longDate(r.startDate)} a{" "}
              {longDate(r.endDate)}.
            </strong>
          </p>
        )}
        <p>
          <strong>Parágrafo Primeiro</strong> - O valor da contraprestação acima pactuado satisfaz, exclusivamente, a
          prestação de serviços decorrentes da carga horária constante da proposta curricular da CONTRATADA e de seu
          calendário escolar do ano letivo de {year} e só poderá ser reajustado quando expressamente previsto em Lei.
          Bolsas de estudo, descontos e assemelhados são apenas para o ano contratado, não outros; não geram direitos
          adquiridos nem expectativas para períodos posteriores ao ano civil contratado.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - Caso o pagamento seja efetuado até do dia do vencimento 10, o valor será
          deduzido de R$ 90,00 (noventa reais) a título de desconto de pontualidade.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> - É de exclusiva responsabilidade do(a) CONTRATANTE a aquisição de
          uniforme, vestuário e do material escolar, não configurando esta aquisição, em hipótese alguma, parte
          integrante da anuidade aqui contratada.
        </p>
        <p>
          <strong>Parágrafo Quarto</strong> - A aquisição do material didático deve ser efetuada para todo o ano letivo,
          cujo valor integral é de R$ 2.017,00 (dois mil e dezessete reais), a ser pago no ato da matricula, podendo ser
          parcelado em até 02 (duas) parcelas, via cartão de crédito. O material didático deverá ser retirado em 02
          (duas) etapas, sendo a primeira no início do 1º Semestre letivo, e a segunda no início do 2º Semestre letivo.
          Caso haja rescisão o(a) CONTRATANTE terá direito à restituição do valor relativo ao material didático do
          Semestre NÃO INICIADO.
        </p>

        <p className="clause">
          <strong>Cláusula Quarta:</strong> Os descontos concedidos, quer decorrentes de pontualidade, quer em virtude
          de negociação no ato da contratação, possuem natureza voluntária, e estão agregados à condição resolutiva,
          qual seja, a ausência de inadimplemento ou mora de qualquer das parcelas contratadas, de forma que nessas
          hipóteses, mora ou inadimplência, voltará a viger o valor originalmente contratado, perdendo o(a) CONTRATANTE
          todo e qualquer desconto do qual seja eventualmente beneficiário(a).
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - O pagamento efetuado após a data de vencimento 10 , será acrescido multa
          no valor de 2% (dois por cento) da prestação em atraso, sem prejuízo da atualização monetária, se houver, de
          acordo com os índices de apuração da inflação e juros de 1% (um por cento) ao mês.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - Poderá a CONTRATADA, para a cobrança de seu crédito, fazer inscrever o
          nome do(a) CONTRATANTE em bancos de dados cadastrais (SPC/DPC e outros similares), protestar duplicatas e
          letras de câmbio de prestação de serviços, em conformidade com a legislação vigente, após 30 (trinta) dias de
          inadimplência e valer-se de firma especializada, caso em que o(a) CONTRATANTE inadimplente responderá, também,
          pelas despesas havidas com a cobrança extrajudicial e judicial, bem como, por honorários de 10% do montante na
          cobrança extrajudicial dos valores devidos, atualizados monetariamente e acrescidos de juros legais de 1% ao
          mês, ficando assegurados iguais direitos ao(à) CONTRATANTE frente às obrigações não cumpridas pela CONTRATADA.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> - Se a CONTRATADA precisar recorrer à cobrança judicial, o(a) CONTRATANTE
          inadimplente responderá, também, por todos os valores das dívidas principais, das despesas administrativas,
          por honorários de 20% do montante a esta devidos, juros legais de 1% ao mês, ficando assegurados iguais
          direitos ao(à) CONTRATANTE frente às obrigações não cumpridas pela CONTRATADA. Caso os honorários
          sucumbenciais sejam revertidos em favor da contratante, os valores deferidos serão compensados com os do
          percentual ora pactuado.
        </p>
        <p>
          <strong>Parágrafo Quarto</strong> - O pagamento das obrigações financeiras do(a) CONTRATANTE comprovar-se-á
          mediante a apresentação do recibo, boleto ou carnê que individualize a obrigação paga.
        </p>
        <p>
          <strong>Parágrafo Quinto</strong> - O não comparecimento do ALUNO aos atos escolares não dispensa o pagamento
          nem o cumprimento do contrato, especialmente diante da disponibilidade dos serviços ao consumidor.
        </p>

        <p className="clause">
          <strong>Cláusula Quinta:</strong> Se o(a) CONTRATANTE desistir da matricula até 10 (dez) dias antes do início
          do ano letivo, terá devolução de 50% (cinquenta por cento) do que já houver sido pago. A CONTRATADA reterá a
          diferença para cobertura de tributos e contribuições incidentes sobre o faturamento (15% IRPJ; 9% CSLL; 3%
          COFINS; 2% ISS; 1% PIS – TOTAL 30%) , despesas administrativas e com pessoal (10%), além da ocupação de vagas
          e indenização pela perda de uma chance em relação a novos discentes (10%). Compreendem as partes e concordam
          com o arbitramento dos percentuais acima.
        </p>

        <p className="clause">
          <strong>Cláusula Sexta:</strong> Este Contrato não inclui o fornecimento de livros paradidáticos indicados por
          editais de exames vestibulares, equipamentos eletrônicos, softwares, material escolar, uniformes, avaliações
          substituições, cursos paralelos, serviços facultativos e de carteira estudantil pelos quais a CONTRATADA
          poderá cobrar as despesas correspondentes.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - O uso do uniforme escolar é obrigatório, conforme previsto na lei
          federal 8.907/1994 e normas de vestuário da CONTRATADA.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - Os serviços extraordinários efetivamente prestados ao(a) Aluno(a), dos
          quais citamos, exemplificativamente: segunda chamada de avaliações e exames conforme prazo previsto no
          regimento interno em até 48 horas contadas a partir da data da prova perdida e segunda via de carteira
          estudantil, serão cobrados à parte, independentemente de atestado médico, sendo que os valores destes serviços
          extraordinários estão à disposição na Secretaria.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> - Considera-se serviço extraordinário, ainda, a eventual avaliação e
          exames para avanço escolar, o material escolar específico dessa avaliação será cobrado à parte, sendo que
          esses valores estão à disposição na Secretaria da CONTRATADA, restando claro que, ainda que aprovado na
          avaliação, não estará o(a) CONTRATANTE isento do pagamento do material didático adquirido para todo o ano
          letivo.
        </p>

        <p className="clause">
          <strong>Cláusula Sétima:</strong> O presente instrumento poderá ser rescindido por iniciativa do(a)
          CONTRATANTE (configurando cancelamento da matrícula e transferência do aluno) mediante requerimento enviado
          via e-mail ou por escrito entregue à secretaria da CONTRATADA.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - Para efetivação da rescisão de que trata esta cláusula, o(a) CONTRATANTE
          deverá estar quite com suas obrigações financeiras. Ciente que, caso a rescisão seja solicitada antes do dia
          10 do mês vigente, será cobrado apenas o valor proporcional sobre estes dias e caso a solicitação seja
          realizada do dia 10 em diante do mês vigente, a cobrança da mensalidade será integral. Este Parágrafo
          contempla as rescisões efetuadas até o dia 31 de outubro de {year}.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> – A data-limite para o(a) CONTRATANTE requerer a rescisão do presente
          Contrato, ou para caracterizar a rescisão tácita por abandono, após notificação, é dia{" "}
          <strong>
            31 de outubro de {year}, caso ultrapasse esse limite, serão devidas todas as parcelas até o final do
            contrato, conforme alínea “a”abaixo.
          </strong>
        </p>
        <p>
          <strong>Alínea a:</strong> Caso a solicitação da rescisão ocorra a partir de 1º de novembro de {year}, o(a)
          CONTRATANTE deverá liquidar, também as parcelas relativas aos meses de novembro e dezembro, estando ora ciente
          e de acordo com a referida cobrança.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> - No caso da não apresentação de requerimento previsto nesta cláusula, até
          o dia 31 de outubro de {year}, será considerado abandono de curso, se constatado pela CONTRATADA a ausência
          contumaz do discente.
        </p>

        <p className="clause">
          <strong>Cláusula Oitava:</strong> Obriga-se o(a) CONTRATANTE a fazer o(a) aluno(a) cumprir o calendário
          escolar, o calendário de avaliação e os horários estabelecidos pelo ÚNICO EDUCACIONAL, assumindo total
          responsabilidade pelos problemas advindos da não observância destes.
        </p>
        <p>
          <strong>Parágrafo Único</strong> - A comunicação dos eventos acadêmicos, resultados de avaliações, boletins,
          calendários e quaisquer outras informações poderão ser apenas por meio eletrônico. O não recebimento destas em
          virtude da não atualização do endereço eletrônico será de responsabilidade do(a) CONTRATANTE.
        </p>

        <p className="clause">
          <strong>Cláusula Nona:</strong> O ALUNO já matriculado, salvo quando inadimplente em relação às obrigações
          disciplinares, contratuais ou financeiras do CONTRATANTE, terá direito à renovação de matrícula para o ano
          letivo seguinte, se tiver sido aprovado academicamente na série/ano de referência, conforme o calendário
          escolar da instituição, que definirá prazo para a rematrícula preferencial, após o qual as vagas serão
          ofertadas para terceiros e ao público geral, em que o ALUNO não mais terá preferência.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - A rematrícula realizada antes do final do ano letivo corrente será
          cancelada em caso de reprovação do aluno, dando-se a ele preferência de 15 (quinze) dias corridos após o
          último dia letivo para se matricular na mesma série ou mesmo ano, caso haja vaga.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - A rematrícula realizada antes do vencimento ou de pagamento das últimas
          parcelas do ano letivo antecedente, poderá ser cancelada pela CONTRATADA em caso de não quitação da anuidade
          dentro dos vencimentos normais.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> - Se, entre o ato de rematrícula e o primeiro dia do novo ano letivo
          seguinte ocorrer penalização do aluno por atos disciplinares graves, poderá a CONTRATADA optar pela rescisão
          da rematrícula, após oportunidade de eventual defesa da família.
        </p>

        <p className="clause">
          <strong>Cláusula Décima:</strong> O(A) CONTRATANTE cede, gratuitamente, o direito de imagem do(a)
          beneficiário(a), do qual é responsável legal, para figurar, coletivamente, em campanhas institucionais ou
          publicitárias da CONTRATADA, para todos os efeitos legais, observada a moral e os bons costumes; bem assim os
          direitos autorais por trabalhos escolares de qualquer natureza, para publicação em jornais, livros e impressos
          do CONTRATADO e apresentação em feiras, exposições e eventos de natureza escolar.
        </p>

        <p className="clause">
          <strong>Cláusula Décima Primeira:</strong> A CONTRATADA não se responsabiliza pela guarda e consequente
          indenização, decorrente do extravio ou dos danos causados a quaisquer objetos levados ao estabelecimento da
          CONTRATADA, especialmente os não pertinentes ao processo de aprendizagem, como joias, dinheiro, telefones
          celulares e demais aparelhos eletrônicos ou documentos, pertencentes ou sob a posse do(a) beneficiário(a)
          do(a) CONTRATANTE, do DISCENTE ou de seus prepostos ou acompanhantes, exceto se decorrentes atos de
          subordinados da CONTRATADA.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - A CONTRATADA será indenizada pelo CONTRATANTE por qualquer dano ou
          prejuízo que este ou o ALUNO cause à CONTRATADA, às instalações, aos trabalhadores, aos fornecedores, ao
          público, aos consumidores etc.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> - A CONTRATADA pode PROIBIR ou delimitar o uso de eletrônicos em seu
          ambiente.
        </p>

        <p className="clause">
          <strong>Cláusula Décima Segunda:</strong> O(A) CONTRATANTE declara que teve conhecimento prévio das condições
          financeiras deste Contrato, que foi exposto em local de fácil acesso e visualização (art. 2º da Lei nº
          9.870/99), conhecendo-as e aceitando-as livremente.
        </p>

        <p className="clause">
          <strong>Cláusula Décima Terceira:</strong> A CONTRATADA cumpre e continuará a cumprir suas obrigações em
          consonância com a Lei de Proteção de Dados em vigor no Brasil, na medida em que tais obrigações sejam
          aplicáveis para este CONTRATO. Além disso, tanto a CONTRATADA quanto o(a) CONTRATANTE se comprometem a manter
          medidas administrativas, técnicas e físicas concebidas para assegurar e proteger a confidencialidade,
          integridade e disponibilidade de todos os dados pessoais trafegados, quando em posse de qualquer das Partes, e
          eventual operador, contra acesso não autorizado, ilícito ou acidental, divulgação, transferência, destruição,
          perda ou alteração.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> - As Partes não divulgarão qualquer dado pessoal para a outra Parte que
          não seja essencial para a execução do presente Instrumento, restringindo o acesso da outra parte aos Dados
          Pessoais e somente para pessoas devidamente autorizadas.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> – Se exigida pelo pai ou pela mãe do aluno, independentemente de regime de
          guarda, a CONTRATADA prestará informações a qualquer dos genitores sobre o filho, mesmo a respeito do presente
          contrato e seu cumprimento em qualquer aspecto, inclusive financeiro.
        </p>
        <p>
          <strong>Parágrafo Terceiro</strong> – O(a) CONTRATANTE deverá dar ciência a todos os colaboradores que
          mantenham contato com o presente contrato, dos termos do presente Instrumento, a fim de que possa tratar e
          compartilhar com as partes ora envolvidas, os dados pessoais expostos em razão deste instrumento.
        </p>
        <p>
          <strong>Parágrafo Quarto</strong> – Todo aquele que manifestar a não concordância com os termos do presente
          instrumento deverá ser excluído do acesso aos dados aqui expostos, e não poderá utilizá-lo, sob nenhuma
          hipótese.
        </p>
        <p>
          <strong>Parágrafo Quinto</strong> - A exclusão será formalizada mediante mensagem de e-mail ao CONTRATANTE.
        </p>
        <p>
          <strong>Parágrafo Sexto</strong> - Os dados aqui expostos serão armazenados pelo tempo que perdurar a vigência
          do presente Instrumento, sendo que, havendo a extinção do vínculo existente entre as Partes, os dados
          recebidos no âmbito deste CONTRATO serão excluídos no prazo de até 30 (trinta) dias úteis contados da extinção
          contratual, podendo, para tanto, serem conservados caso se verifique a necessidade do cumprimento de obrigação
          legal ou regulatória por parte do(a) CONTRATANTE, nos termos da legislação vigente, bem como no caso de alguma
          transação que extrapole o prazo deste CONTRATO.
        </p>
        <p>
          <strong>Parágrafo Sétimo</strong> - Os Dados Pessoais poderão ser compartilhados com autoridades judiciais,
          administrativas ou governamentais competentes, sempre que houver requerimento, requisição ou ordem judicial,
          bem como de forma automática, no caso de movimentações societárias, como fusão, aquisição e incorporação da
          CONTRATADA.
        </p>
        <p>
          <strong>Parágrafo Oitavo</strong> - Os dados coletados serão armazenados em meios próprios da CONTRATADA,
          localizados no Brasil, bem como em ambiente de uso de recursos ou servidores na nuvem, o que enseja, neste
          último caso, a transferência ou processamento de dados fora do Brasil, sem prejuízo da aplicação da legislação
          brasileira.
        </p>
        <p>
          <strong>Parágrafo Nono</strong> - As Partes poderão utilizar estritamente para o cumprimento e divulgação do
          objeto do presente Instrumento, os nomes, marcas e/ou logos de cada uma, independentemente de prévia e
          expressa autorização da outra Parte.
        </p>

        <p className="clause">
          <strong>Cláusula Décima Quarta:</strong> As Partes atribuem ao presente Contrato plena eficácia e força
          executiva extrajudicial. Fica eleito o foro do endereço da CONTRATADA, concordando desde já que a assinatura
          mediante certificado eletrônico, ou por intermédio da plataforma gov.br, supre a ausência de assinatura física
          para todos os efeitos legais, inclusive constituição de título executivo extrajudicial.
        </p>
        <p>
          <strong>Parágrafo Primeiro</strong> – O consentimento presumido por intermédio da assinatura, será considerado
          suprido para todos os efeitos legais, se restar demonstrado que houve aquiescência tácita, apurada pela
          regular frequência do aluno às atividades acadêmicas do ano letivo.
        </p>
        <p>
          <strong>Parágrafo Segundo</strong> – Constatada pela CONTRATADA a ausência contumaz do discente, o responsável
          será notificado para eventual retomada da frequência, ou justificativa da ausência, e caso não haja
          manifestação em 30 dias, será considerado rescindido o contrato por abandono, aplicando-se o teor da cláusula
          sétima.
        </p>
        <p className="clause">
          Por estarem as Partes de acordo com os termos e condições do presente instrumento, assinam o presente Contrato
          em duas vias de igual teor e forma, juntamente com duas testemunhas, para que se produzam todos os efeitos
          jurídicos.
        </p>
      </article>
      <section className="no-break">
        <p className="date">Brasília, {longDate(r.enrollment.enrolledAt)}</p>
        <div className="contract-signatures">
          <div className="signature">
            <div className="line">{payer.name}</div>
            <small>Contratante/Responsável Financeiro</small>
          </div>
          <div className="signature">
            <div className="line">ÚNICO EDUCACIONAL</div>
            <small>Contratada</small>
          </div>
        </div>
        <div className="witnesses">
          {[1, 2].map((n) => (
            <div key={n}>
              <p>
                <strong>Testemunha {n}:</strong>
              </p>
              <p>
                Nome: <span className="blank">&nbsp;</span>
              </p>
              <p>
                CPF: <span className="blank">&nbsp;</span>
              </p>
            </div>
          ))}
        </div>
      </section>
    </main>
  );
}

/** A declaração on the letterhead (escolaridade, comparecimento): title, body, date and the secretária's signature. */
export function Declaracao({
  title,
  className = "",
  children,
}: {
  title: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <main className={`enr declaration-page ${className}`}>
      <style>{BASE_CSS + DECLARATION_CSS}</style>
      <div className="heading">
        <img className="logo" src={LOGO} alt="Único Educacional" />
        {DECLARATION_HEADING.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
      <h1>{title}</h1>
      <div className="body">{children}</div>
      <p className="date">Brasília, {longDate(today())}.</p>
      <p className="signature">Assinatura da Secretária Escolar</p>
      <footer>
        <p>
          <b>{DECLARATION_FOOTER[0]}</b>
        </p>
        <p>{DECLARATION_FOOTER[1]}</p>
      </footer>
    </main>
  );
}

const STUDENT_PASS_CSS = `
.enr.pass h1 { margin: 32px 0; }
.enr .pass-data { margin: 0 0 20px; line-height: 1.5; }
.enr .pass-data .gap { margin-top: 14px; }
.enr .calendar { width: 70%; margin: 24px auto 28px; padding: 8px 16px; border: 2px solid #4b5563; font-size: 10.5pt; }
.enr .calendar h2 { margin: 0; font-size: 11pt; font-weight: bold; text-align: center; }
.enr .body .calendar p { text-indent: 0; line-height: 1.8; }
`;

/** The declaração de passe estudantil (not in Django: copied from the secretaria's paper model). */
export function PasseEstudantil({ r, title }: { r: EnrollmentReport; title: string }) {
  const s = r.student;
  const shift = upper(SHIFT_PERIODS[r.schoolClass?.shift ?? ""]);
  const parents = [r.father, r.mother].flatMap((p) => (p ? [upper(p.name)] : [])).join(" e ");
  return (
    <Declaracao title={title} className="pass no-footer">
      <style>{STUDENT_PASS_CSS}</style>
      <div className="pass-data">
        <div>Estudante: {upper(s.name)}</div>
        <div>Matrícula: {s.registration}</div>
        <div>Data de nascimento: {formatDate(s.birthDate)}</div>
        <div>CPF: {formatDocument(s.cpf)}</div>
        <div>Filiação: {parents}</div>
        <div>Naturalidade: {s.placeOfBirth}</div>
        <div>Endereço: {upper(fullAddress(s))}</div>
        <div className="gap">Telefones:</div>
        {r.father && <div>Pai: {formatPhone(r.father.mobile)}</div>}
        {r.mother && <div>Mãe: {formatPhone(r.mother.mobile)}</div>}
        <div>Celular do(a) aluno(a): {formatPhone(s.mobile)}</div>
        <div className="gap">{upper(r.program)}</div>
        <div>
          Série: {r.grade}ª Série &emsp; Turma: {upper(r.schoolClass?.name)} &emsp; Turno: {shift}
        </div>
      </div>
      <div className="calendar">
        <h2>Calendário Escolar</h2>
        <p>Início do ano letivo: {formatDate(r.yearBegins)}.</p>
        <p>Término do ano letivo: {formatDate(r.yearEnds)}.</p>
        {r.recess && (
          <p>
            Recesso escolar: {formatDate(r.recess.from)} a {formatDate(r.recess.to)}.
          </p>
        )}
        <p>Horário Matutino: 07:10 às 13h. Vespertino: 14h às 19h.</p>
      </div>
      <p>
        Declaramos que o(a) aluno(a) supracitado(a) está regularmente matriculado(a) nesta Instituição Educacional, no
        turno <b>{shift}</b>, de segunda a sexta-feira, conforme Calendário Escolar
        {r.schoolClass?.shift === "M" && ", e com um retorno semanal obrigatório no turno vespertino, das 14h às 18h"}.
      </p>
      <p>Informamos ainda que serão ministradas provas aos sábados das 9h às 13h.</p>
    </Declaracao>
  );
}

/** The declaração de transferência (not in Django: copied from the secretaria's paper model). */
export function Transferencia({ r, title }: { r: EnrollmentReport; title: string }) {
  return (
    <Declaracao title={title} className="transfer no-footer">
      <p>
        Declaramos para os devidos fins que a transferência do(a) aluno(a) <b>{upper(r.student.name)}</b> foi solicitada
        na data indicada, podendo matricular-se na {r.grade}ª Série. O Histórico Escolar será emitido no prazo máximo de
        30 dias, a contar desta data.
      </p>
    </Declaracao>
  );
}

/**
 * The requerimento de prova substitutiva (the student's request) and, below the cut line, its protocolo (the
 * student's copy with the new exam's date, time and fee). The blanks come from the toolbar form (`ExamBlank`).
 */
export function ProvaSubstitutiva({ r }: { r: EnrollmentReport }) {
  const name = upper(r.student.name);
  const grade = `${r.grade}ª Série`;
  const klass = upper(r.schoolClass?.name);
  const date = <p className="date">Brasília, {longDate(today())}.</p>;
  return (
    <main className="enr exam-request">
      <style>{BASE_CSS + EXAM_REQUEST_CSS}</style>
      <div className="logo-row">
        <img className="logo" src={LOGO} alt="Único Educacional" />
      </div>
      <h1>Requerimento de Prova Substitutiva</h1>
      <p className="exam-request-body">
        Eu, {name}, matrícula: {r.student.registration}, Série: {grade}
        {klass && `, Turma: ${klass}`}, venho solicitar a realização de prova substitutiva, ocorrida no dia{" "}
        <ExamBlank name="missedOn" />.
      </p>
      <p className="exam">
        Prova: <ExamBlank name="exam" />
      </p>
      {date}
      <p className="signature">Assinatura do(a) responsável e/ou aluno(a)</p>
      <hr className="cut" />
      <h1>Protocolo de Prova Substitutiva</h1>
      <dl>
        <div className="wide">
          <dt>Aluno(a):</dt>
          <dd>{name}</dd>
        </div>
        <div>
          <dt>Série:</dt>
          <dd>{grade}</dd>
        </div>
        <div>
          <dt>Turma:</dt>
          <dd>{klass}</dd>
        </div>
        <div className="wide">
          <dt>Prova:</dt>
          <dd>
            <ExamBlank name="exam" />
          </dd>
        </div>
        <div>
          <dt>Data da prova substitutiva:</dt>
          <dd>
            <ExamBlank name="date" />
          </dd>
        </div>
        <div>
          <dt>Horário:</dt>
          <dd>
            <ExamBlank name="time" />
          </dd>
        </div>
        <div className="wide">
          <dt>Valor:</dt>
          <dd>
            <ExamBlank name="value" />
          </dd>
        </div>
      </dl>
      {date}
      <p className="signature">Assinatura</p>
    </main>
  );
}
