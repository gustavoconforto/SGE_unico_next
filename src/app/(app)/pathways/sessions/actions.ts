"use server";

import { and, eq, inArray, notInArray } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { pathwaysPathwayattendance as attendance, pathwaysPathwayenrollment as member, pathwaysPathwaysession as session } from "@/db/schema/app";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { type FormState, INVALID_CHOICE, foreignKey, optionalText, parseForm, requiredDate } from "@/lib/form";
import { requireSession } from "@/lib/session";
import { getOffering, membersBetween } from "../data";

const schema = z.object({ offeringId: foreignKey, date: requiredDate, topic: optionalText(200) });

/** "Nova aula" saves the lesson and opens its roll call; a lesson's offering can't change. */
export async function saveSession(id: number | null, back: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const [current] = id ? await db.select().from(session).where(eq(session.id, id)) : [];
  if (current) formData.set("offeringId", String(current.offeringId));
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const o = await getOffering(data.offeringId);
  if (!o) return { errors: { offeringId: [INVALID_CHOICE] }, values };
  if (data.date < o.y.begins || data.date > o.y.ends) return { errors: { date: ["A data está fora do ano escolar do itinerário."] }, values };
  let sessionId = id;
  await db.transaction(async (tx) => {
    if (sessionId === null) [{ id: sessionId }] = await tx.insert(session).values(data).returning({ id: session.id });
    else {
      await tx.update(session).set({ date: data.date, topic: data.topic }).where(eq(session.id, sessionId));
      // Students who weren't in the pathway on the new date leave the roll call
      if (current && current.date !== data.date) {
        const members = tx.select({ id: member.id }).from(member).where(membersBetween(current.offeringId, data.date, data.date));
        await tx.delete(attendance).where(and(eq(attendance.sessionId, sessionId), notInArray(attendance.pathwayEnrollmentId, members)));
      }
    }
  });
  if (id === null) redirect(`/pathways/sessions/${sessionId}/attendance?msg=created`);
  const target = /^\/pathways\/sessions(\?offering=\d+)?$/.test(back) ? back : "/pathways/sessions";
  redirect(`${target}${target.includes("?") ? "&" : "?"}msg=updated`);
}

/** The attendance is part of its lesson: deleting a lesson deletes its roll call. */
export async function deleteSession(id: number) {
  await requireSession();
  await db.transaction(async (tx) => {
    await tx.delete(attendance).where(eq(attendance.sessionId, id));
    await tx.delete(session).where(eq(session.id, id));
  });
  redirect("/pathways/sessions?msg=deleted");
}

/** AttendanceSheetForm: one status per student in the pathway on the lesson's date. */
export async function saveAttendance(sessionId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const [s] = await db.select().from(session).where(eq(session.id, sessionId));
  if (!s) redirect("/pathways/sessions");
  const members = await db.select({ id: member.id }).from(member).where(membersBetween(s.offeringId, s.date, s.date));
  const existing = members.length ? await db.select().from(attendance).where(and(eq(attendance.sessionId, sessionId), inArray(attendance.pathwayEnrollmentId, members.map((m) => m.id)))) : [];
  const statuses = members.map((m) => ({ id: m.id, status: String(formData.get(`status_${m.id}`) ?? "") }));
  if (statuses.some((x) => !["P", "F", "J"].includes(x.status))) return { formError: "Escolha a presença de cada aluno." };
  try {
    await db.transaction(async (tx) => {
      for (const x of statuses) {
        const saved = existing.find((a) => a.pathwayEnrollmentId === x.id);
        if (!saved) await tx.insert(attendance).values({ sessionId, pathwayEnrollmentId: x.id, status: x.status });
        else if (saved.status !== x.status) await tx.update(attendance).set({ status: x.status }).where(eq(attendance.id, saved.id));
      }
    });
  } catch (error) {
    // Two people saved this roll call at once (unique_pathway_attendance)
    if (pgErrorCode(error) !== UNIQUE_VIOLATION) throw error;
    return { formError: "Outra pessoa acabou de salvar a chamada desta aula. Recarregue a página e confira. Nada foi salvo." };
  }
  redirect(`/pathways/sessions?offering=${s.offeringId}&msg=updated`);
}
