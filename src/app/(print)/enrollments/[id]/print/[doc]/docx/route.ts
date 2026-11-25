import { readFile } from "node:fs/promises";
import path from "node:path";
import { AlignmentType, BorderStyle, Document, Footer, ImageRun, Packer, Paragraph, TextRun } from "docx";
import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/authorization";
import { longDate } from "@/lib/enrollment-report";
import { today } from "@/lib/finance";
import { idParam } from "@/lib/list";
import { DECLARATION_FOOTER, DECLARATION_HEADING } from "../../documents";
import { declarationParagraphs, loadEnrollmentReport } from "../../report";

// next.config.ts traces this file into the route (outputFileTracingIncludes): Vercel serves public/ from its CDN
const LOGO = path.join(process.cwd(), "public/img/unico_logo_stamp.png");
const line = (color: string, size: number) => ({ style: BorderStyle.SINGLE, size, color, space: 4 });

/** The declaração de escolaridade as a Word file, for the secretaria to adapt before printing. */
export async function GET(_request: Request, ctx: RouteContext<"/enrollments/[id]/print/[doc]/docx">) {
  await requirePermission("enrollments", "view");
  if ((await ctx.params).doc !== "declaracao") notFound();
  const r = await loadEnrollmentReport(await idParam(ctx.params));
  if (!r || r.enrollment.status !== "A") notFound();

  const doc = new Document({
    styles: { default: { document: { run: { font: "Arial", size: 24 } } } },
    sections: [
      {
        properties: {
          page: {
            size: { width: "210mm", height: "297mm" },
            margin: { top: "14mm", bottom: "14mm", left: "20mm", right: "20mm" },
          },
        },
        footers: {
          default: new Footer({
            children: DECLARATION_FOOTER.map(
              (text, i) =>
                new Paragraph({
                  alignment: AlignmentType.CENTER,
                  border: i === 0 ? { top: line("4B5563", 12) } : undefined,
                  children: [new TextRun({ text, bold: i === 0, size: 18, color: "4B5563" })],
                }),
            ),
          }),
        },
        children: [
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 360 },
            children: [
              new ImageRun({
                type: "png",
                data: await readFile(LOGO),
                transformation: { width: 160, height: 76 },
                altText: { name: "Único Educacional", description: "Único Educacional", title: "Único Educacional" },
              }),
            ],
          }),
          ...DECLARATION_HEADING.map(
            (text) =>
              new Paragraph({
                alignment: AlignmentType.CENTER,
                children: [new TextRun({ text, font: "Consolas", size: 14 })],
              }),
          ),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1100, after: 1200 },
            children: [new TextRun({ text: "DECLARAÇÃO DE ESCOLARIDADE", bold: true, size: 28 })],
          }),
          ...declarationParagraphs(r).map(
            (runs) =>
              new Paragraph({
                alignment: AlignmentType.JUSTIFIED,
                indent: { firstLine: "1.25cm" },
                spacing: { line: 480 },
                children: runs.map((run) => new TextRun(run)),
              }),
          ),
          new Paragraph({
            alignment: AlignmentType.RIGHT,
            spacing: { before: 1100 },
            children: [new TextRun(`Brasília, ${longDate(today())}.`)],
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { before: 1700 },
            indent: { left: "3cm", right: "3cm" },
            border: { top: line("111827", 6) },
            children: [new TextRun("Assinatura da Secretária Escolar")],
          }),
        ],
      },
    ],
  });

  const file = `declaracao-escolaridade-${r.student.registration.replace(/[^\w-]/g, "")}.docx`;
  return new Response(new Uint8Array(await Packer.toBuffer(doc)), {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
      "Content-Disposition": `attachment; filename="${file}"`,
      "Cache-Control": "private, no-store",
    },
  });
}
