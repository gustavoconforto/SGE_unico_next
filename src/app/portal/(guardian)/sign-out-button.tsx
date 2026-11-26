"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PORTAL_LOGIN } from "@/lib/portal-paths";
import { deletePushSubscription } from "../actions";
import { PORTAL_SW } from "./push-prompt";

/** Signs out, first dropping this device's push subscription: a shared phone stops getting this guardian's notices. */
export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
    const registration = await navigator.serviceWorker?.getRegistration(PORTAL_SW);
    const sub = await registration?.pushManager.getSubscription();
    if (sub) await deletePushSubscription(sub.endpoint).then(() => sub.unsubscribe());
    await authClient.signOut();
    router.replace(PORTAL_LOGIN);
  }
  return (
    <button
      type="button"
      onClick={signOut}
      className="flex min-h-11 items-center gap-1 rounded-lg px-3 text-sm text-gray-700 hover:bg-gray-100"
    >
      <span className="material-symbols-outlined text-gray-500" aria-hidden>
        logout
      </span>
      Sair
    </button>
  );
}
