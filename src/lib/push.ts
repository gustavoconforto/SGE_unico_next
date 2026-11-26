// Web Push to guardians' devices (portal_pushsubscription). Off until the three VAPID env vars are set.
import "server-only";

import { and, eq, exists, inArray, isNotNull, sql } from "drizzle-orm";
import { sendNotification, setVapidDetails, WebPushError } from "web-push";
import { db } from "@/db";
import { enrollmentsEnrollment as enrollment, studentsGuardianassociation as link } from "@/db/schema/app";
import { portalPushsubscription as subscription, user } from "@/db/schema/auth";
import { PORTAL_HOME } from "./portal-paths";
import { ref } from "./sql";

const publicKey = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY;
const privateKey = process.env.VAPID_PRIVATE_KEY;
const subject = process.env.VAPID_SUBJECT;

/** Whether this deployment can push (VAPID keys and subject set). */
export const pushEnabled = Boolean(publicKey && privateKey && subject);
if (pushEnabled) setVapidDetails(subject!, publicKey!, privateKey!);

// Only browser push services: the server POSTs to whatever endpoint a browser hands it (no SSRF to other hosts)
const PUSH_HOSTS = [
  /\.googleapis\.com$/,
  /\.push\.apple\.com$/,
  /\.push\.services\.mozilla\.com$/,
  /\.notify\.windows\.com$/,
];

/** Whether `endpoint` is an https URL of a known browser push service. */
export function isPushEndpoint(endpoint: string) {
  try {
    const url = new URL(endpoint);
    return url.protocol === "https:" && PUSH_HOSTS.some((host) => host.test(url.hostname));
  } catch {
    return false;
  }
}

/** The devices an alert reaches: every guardian login, or those with a student active in `schoolClassId`. */
export async function alertSubscriptions(schoolClassId: number | null) {
  const inClass =
    schoolClassId === null
      ? undefined
      : exists(
          db
            .select({ one: sql`1` })
            .from(link)
            .innerJoin(enrollment, eq(enrollment.studentId, link.studentId))
            .where(
              and(
                sql`${link.guardianId} = ${ref(user.guardianId)}`,
                eq(enrollment.status, "A"),
                eq(enrollment.schoolClassId, schoolClassId),
              ),
            ),
        );
  return db
    .select({
      id: subscription.id,
      endpoint: subscription.endpoint,
      p256dh: subscription.p256dh,
      auth: subscription.auth,
    })
    .from(subscription)
    .innerJoin(user, eq(subscription.userId, user.id))
    .where(and(isNotNull(user.guardianId), inClass));
}

// shortcut: pushAlert sends inline in one after() call; move to a queue if subscriptions grow past a few thousand
const BATCH = 50;

/** Pushes the alert to every device it reaches; deletes subscriptions the push service reports gone. */
export async function pushAlert(alert: { title: string; body: string; schoolClassId: number | null }) {
  if (!pushEnabled) return;
  const targets = await alertSubscriptions(alert.schoolClassId);
  const payload = JSON.stringify({ title: alert.title, body: alert.body.slice(0, 240), url: PORTAL_HOME });
  const gone: number[] = [];
  for (let i = 0; i < targets.length; i += BATCH) {
    await Promise.all(
      targets.slice(i, i + BATCH).map((t) =>
        sendNotification({ endpoint: t.endpoint, keys: { p256dh: t.p256dh, auth: t.auth } }, payload, {
          TTL: 24 * 60 * 60,
        }).catch((error: unknown) => {
          if (error instanceof WebPushError && (error.statusCode === 404 || error.statusCode === 410)) gone.push(t.id);
          else console.error("push failed", t.id, error);
        }),
      ),
    );
  }
  if (gone.length) await db.delete(subscription).where(inArray(subscription.id, gone));
}
