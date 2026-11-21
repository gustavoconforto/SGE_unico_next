"use server";

import { and, desc, eq, ilike, inArray, like } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { studentsGuardianassociation as link, studentsStudent as student } from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgConstraint, pgErrorCode } from "@/lib/db-error";
import { today } from "@/lib/finance";
import { type FormState, REQUIRED, anotherUrl, checkbox, optionalText, parseForm } from "@/lib/form";
import { readPhoto, saveStudentPhoto } from "@/lib/media";
import { personFields, personUniqueError, phoneDigits } from "@/lib/person";
import { foldSql, stripAccents } from "@/lib/list";
import { BLOOD_TYPES, type GuardianRow, guardianRowSchema, guardianRowsError, nextRegistration } from "@/lib/students";
import { requireSession } from "@/lib/session";

const studentSchema = z.object({
  ...personFields,
  phone: phoneDigits,
  mobile: phoneDigits,
  socialName: optionalText(200),
  useSocialName: checkbox,
  bloodType: z.enum(BLOOD_TYPES.map(([t]) => t) as [string, ...string[]], { error: REQUIRED }),
  schoolFrom: optionalText(200),
  observations: z.string().default(""),
  isSelfFinancial: checkbox,
}).refine((d) => !d.useSocialName || d.socialName, {
  path: ["socialName"],
  message: "Informe o nome social para usá-lo.",
  // Check it alongside the other errors, not only once they're fixed (Zod skips object refinements by default)
  when: (p) => !p.issues.some((i) => i.path?.[0] === "socialName" || i.path?.[0] === "useSocialName"),
});

/** The guardian rows travel as JSON in a hidden input; rows left blank are ignored (Django's extra form). */
function parseGuardianRows(raw: string): { rows: GuardianRow[] } | { error: string } {
  let list: unknown;
  try {
    list = JSON.parse(raw || "[]");
  } catch {
    return { error: "Lista de responsáveis inválida." };
  }
  if (!Array.isArray(list)) return { error: "Lista de responsáveis inválida." };
  const rows: GuardianRow[] = [];
  for (const [i, item] of list.entries()) {
    if (item?.id == null && !item?.guardianId && !item?.relationship) continue;
    const parsed = guardianRowSchema.safeParse(item);
    if (!parsed.success) return { error: `Responsável ${i + 1}: selecione o responsável e o parentesco.` };
    rows.push(parsed.data);
  }
  return { rows };
}

async function saveGuardianLinks(tx: Parameters<Parameters<typeof db.transaction>[0]>[0], studentId: number, rows: GuardianRow[]) {
  const removed = rows.filter((r) => r.delete && r.id).map((r) => r.id!);
  if (removed.length) await tx.delete(link).where(and(eq(link.studentId, studentId), inArray(link.id, removed)));
  // Clear the flag first so moving "financial" between guardians never trips one_financial_guardian_per_student
  await tx.update(link).set({ isFinancial: false }).where(eq(link.studentId, studentId));
  for (const { id, delete: del, ...fields } of rows) {
    if (del) continue;
    if (id) await tx.update(link).set(fields).where(and(eq(link.id, id), eq(link.studentId, studentId)));
    else await tx.insert(link).values({ ...fields, studentId });
  }
}

export async function saveStudent(id: number | null, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(studentSchema, formData);
  const guardians = parseGuardianRows(values.guardians);
  const guardianError = "error" in guardians ? guardians.error : guardianRowsError(guardians.rows, values.isSelfFinancial === "on");

  const file = formData.get("photo");
  const photo = file instanceof File && file.size > 0 ? await readPhoto(file) : null;
  const errors = { ...state?.errors, ...(photo && "error" in photo && { photo: [photo.error] }) };
  // The guardian error shows inside Responsáveis (GuardianRows reads errors.guardians)
  if (!data || guardianError || Object.keys(errors).length) return { errors: { ...errors, ...(guardianError && { guardians: [guardianError] }) }, values };

  // Homonyms are legitimate, so a same-name student only asks for a second save, not a block (not in Django)
  if (id === null && values.duplicateOk !== data.name) {
    const [twin] = await db
      .select({ registration: student.registration })
      .from(student)
      .where(ilike(foldSql(student.name), stripAccents(data.name).replace(/[\\%_]/g, "\\$&")))
      .limit(1);
    if (twin)
      return {
        formError: `Já existe um aluno chamado ${data.name} (matrícula ${twin.registration}). Confira se não é o mesmo aluno; se for outro, clique em Cadastrar aluno de novo.`,
        values: { ...values, duplicateOk: data.name },
      };
  }

  let studentId = id;
  let registration = "";
  let oldPhoto = "";
  try {
    await db.transaction(async (tx) => {
      if (studentId === null) {
        const year = Number(today().slice(0, 4)); // school's time zone, not the server's UTC clock
        const [last] = await tx
          .select({ registration: student.registration })
          .from(student)
          .where(like(student.registration, `${year}%`))
          .orderBy(desc(student.registration))
          .limit(1);
        registration = nextRegistration(last?.registration, year);
        [{ id: studentId }] = await tx.insert(student).values({ ...data, registration, photo: "" }).returning({ id: student.id });
      } else {
        const [row] = await tx.update(student).set(data).where(eq(student.id, studentId)).returning({ registration: student.registration, photo: student.photo });
        if (!row) throw new Error("Student not found");
        ({ registration, photo: oldPhoto } = row);
      }
      await saveGuardianLinks(tx, studentId!, (guardians as { rows: GuardianRow[] }).rows);
    });
  } catch (error) {
    const personErrors = personUniqueError(error);
    if (personErrors) return { errors: personErrors, values };
    // shortcut: two people saving a new student in the same instant collide here; they just submit again
    if (pgErrorCode(error) === UNIQUE_VIOLATION && pgConstraint(error).endsWith("_registration_key"))
      return { formError: "Outro aluno acabou de receber esta matrícula. Salve novamente.", values };
    throw error;
  }

  if (photo && !("error" in photo)) {
    const name = await saveStudentPhoto(photo, registration, oldPhoto);
    await db.update(student).set({ photo: name }).where(eq(student.id, studentId!));
  }
  // "Cadastrar e começar outro": a blank form that names who was just saved
  const next = id === null ? anotherUrl("/students/new", formData, [], studentId!) : null;
  if (next) redirect(next);
  // Land on the saved student's page, where the new registration number shows
  redirect(`/students/${studentId}?msg=${id === null ? "student_created" : "updated"}`);
}
