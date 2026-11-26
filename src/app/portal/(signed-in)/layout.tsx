import { Spinner } from "flowbite-react";
import Image from "next/image";
import Link from "next/link";
import { Suspense } from "react";
import { Flash } from "@/components/flash";
import { PORTAL_HOME } from "@/lib/portal-paths";
import { requirePortalUser } from "../data";
import { SignOutButton } from "./sign-out-button";

/** The signed-in portal: a phone-first column with the school's bar on top; no staff sidebar. */
export default function GuardianLayout({ children }: LayoutProps<"/portal">) {
  return (
    <div className="flex min-h-screen flex-col">
      <header className="sticky top-0 z-30 border-b border-gray-200 bg-white pt-[env(safe-area-inset-top)]">
        <div className="mx-auto flex h-14 max-w-2xl items-center justify-between gap-2 px-4">
          <Link href={PORTAL_HOME} className="flex items-center gap-2 font-semibold text-gray-900">
            <Image src="/img/unico_logo_pequeno.png" alt="" width={32} height={32} className="rounded-md" />
            Único Educacional
          </Link>
          <SignOutButton />
        </div>
      </header>
      <main id="main" className="mx-auto w-full max-w-2xl flex-1 px-4 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
        <Suspense fallback={<Spinner aria-label="Carregando" />}>
          <Guarded>{children}</Guarded>
        </Suspense>
      </main>
      <Suspense>
        <Flash />
      </Suspense>
    </div>
  );
}

async function Guarded({ children }: { children: React.ReactNode }) {
  await requirePortalUser();
  return children;
}
