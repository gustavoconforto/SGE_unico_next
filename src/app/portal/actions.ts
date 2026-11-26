"use server";

import { and, eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { portalPushsubscription as subscription } from "@/db/schema/auth";
import { isPushEndpoint } from "@/lib/push";
import { requirePortalUser } from "./data";

const subscriptionSchema = z.object({
  endpoint: z.string().max(1000).refine(isPushEndpoint),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** Saves this device's push subscription for the signed-in guardian (a device moves to whoever subscribed last). */
export async function savePushSubscription(input: unknown) {
  const { session } = await requirePortalUser();
  const { endpoint, keys } = subscriptionSchema.parse(input);
  const row = { userId: session.user.id, endpoint, p256dh: keys.p256dh, auth: keys.auth };
  await db.insert(subscription).values(row).onConflictDoUpdate({ target: subscription.endpoint, set: row });
}

/** Stops pushing to this device for the signed-in guardian (on sign-out or when they turn it off). */
export async function deletePushSubscription(endpoint: string) {
  const { session } = await requirePortalUser();
  await db
    .delete(subscription)
    .where(and(eq(subscription.endpoint, endpoint), eq(subscription.userId, session.user.id)));
}
