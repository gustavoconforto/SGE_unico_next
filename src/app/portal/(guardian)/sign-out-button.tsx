"use client";

import { useRouter } from "next/navigation";
import { authClient } from "@/lib/auth-client";
import { PORTAL_LOGIN } from "@/lib/portal-paths";

export function SignOutButton() {
  const router = useRouter();
  async function signOut() {
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
