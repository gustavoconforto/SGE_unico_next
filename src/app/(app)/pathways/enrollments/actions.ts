"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { z } from "zod";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, enrollmentsEnrollmenttype as enrollmentType, pathwaysPathwayattendance as attendance, pathwaysPathwayenrollment as member, pathwaysPathwaygrade as pathwayGrade } from "@/db/schema/app";
import { deleteAndRedirect } from "@/lib/crud";
import { UNIQUE_VIOLATION, pgErrorCode } from "@/lib/db-error";
import { today } from "@/lib/finance";
import { type FormState, foreignKey, optionalDate, parseForm, requiredDate } from "@/lib/form";
import { enrollmentAllowed } from "../../enrollments/data";
import { INVALID_ENROLLMENT } from "../../incidents/records";
import { offeringOptions } from "../data";
import { membershipErrors } from "../membership";
import { requireSession } from "@/lib/session";

const schema = z.object({ offeringId: foreignKey, enrollmentId: foreignKey, joinedAt: requiredDate, leftAt: optionalDate });

export async function saveMember(id: number | null, back: string, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  const { data, values, state } = parseForm(schema, formData);
  if (!data) return state;
  const [current] = id ? await db.select().from(member).where(eq(member.id, id)) : [];
  if (!(await enrollmentAllowed(data.enrollmentId, current?.enrollmentId))) return { errors: INVALID_ENROLLMENT, values };
  const errors = await membershipErrors({ id, ...data });
  if (Object.keys(errors).length) return { errors: Object.fromEntries(Object.entries(errors).map(([k, v]) => [k, [v]])), values };
  try {
    if (id === null) await db.insert(member).values(data);
    else await db.update(member).set(data).where(eq(member.id, id));
  } catch (error) {
    if (pgErrorCode(error) === UNIQUE_VIOLATION) return { errors: { enrollmentId: ["Este aluno já está inscrito nesta turma de itinerário."] }, values };
    throw error;
  }
  // `back` comes from the browser: only the roster list, optionally filtered by offering
  const target = /^\/pathways\/enrollments(\?offering=\d+)?$/.test(back) ? back : "/pathways/enrollments";
  redirect(`${target}${target.includes("?") ? "&" : "?"}msg=${id === null ? "created" : "updated"}`);
}

export async function deleteMember(id: number) {
  await requireSession();
  // Members with attendance or grades are kept (PROTECT): record the leaving date instead
  await deleteAndRedirect(() => db.delete(member).where(eq(member.id, id)), "/pathways/enrollments");
}

/** StudentPathwaysForm: tick the year's offerings; unticking sets the leaving date, ticking a left one reopens it. */
export async function saveStudentPathways(enrollmentId: number, _prev: FormState, formData: FormData): Promise<FormState> {
  await requireSession();
  if (!(await enrollmentAllowed(enrollmentId))) return { formError: "Selecione um aluno." };
  const { yearOfferings, existing } = await studentPathways(enrollmentId);
  const on = today();
  const errors: Record<string, string[]> = {};
  const changes: { offeringId: number; id?: number; joinedAt: string; leftAt: string | null; drop?: boolean }[] = [];
  for (const o of yearOfferings) {
    const ticked = formData.get(`offering_${o.id}`) === "on";
    const m = existing.find((x) => x.offeringId === o.id);
    const current = !!m && m.leftAt === null;
    if (ticked === current) continue;
    const change = !m
      ? { offeringId: o.id, joinedAt: on, leftAt: null }
      : m.leftAt === null
        ? { offeringId: o.id, id: m.id, joinedAt: m.joinedAt, leftAt: m.joinedAt > on ? m.joinedAt : on, drop: m.joinedAt > on }
        : { offeringId: o.id, id: m.id, joinedAt: m.joinedAt, leftAt: null };
    const rowErrors = await membershipErrors({ ...change, enrollmentId });
    if (Object.keys(rowErrors).length) errors[`offering_${o.id}`] = Object.values(rowErrors);
    else changes.push(change);
  }
  if (Object.keys(errors).length) return { errors, formError: "Corrija os itinerários destacados. Nada foi salvo." };
  await db.transaction(async (tx) => {
    for (const c of changes) {
      // A pathway the student hasn't started, with nothing recorded, is dropped instead of getting a leaving date
      if (c.drop && c.id) {
        const hasRecords =
          (await tx.select({ id: attendance.id }).from(attendance).where(eq(attendance.pathwayEnrollmentId, c.id)).limit(1)).length > 0 ||
          (await tx.select({ id: pathwayGrade.id }).from(pathwayGrade).where(eq(pathwayGrade.pathwayEnrollmentId, c.id)).limit(1)).length > 0;
        if (!hasRecords) {
          await tx.delete(member).where(eq(member.id, c.id));
          continue;
        }
      }
      if (c.id) await tx.update(member).set({ leftAt: c.leftAt }).where(eq(member.id, c.id));
      else await tx.insert(member).values({ enrollmentId, offeringId: c.offeringId, joinedAt: c.joinedAt });
    }
  });
  redirect(`/pathways/enrollments/by-student?enrollment=${enrollmentId}&msg=updated`);
}

async function studentPathways(enrollmentId: number) {
  const [e] = await db.select({ schoolYearId: enrollmentType.schoolYearId }).from(enrollment).innerJoin(enrollmentType, eq(enrollment.enrollmentTypeId, enrollmentType.id)).where(eq(enrollment.id, enrollmentId));
  const [yearOfferings, existing] = await Promise.all([offeringOptions({ schoolYearId: e.schoolYearId }), db.select().from(member).where(eq(member.enrollmentId, enrollmentId))]);
  return { yearOfferings, existing };
}
