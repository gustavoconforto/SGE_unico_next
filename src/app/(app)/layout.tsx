import { Spinner } from "flowbite-react";
import { Suspense } from "react";
import { AppSidebar } from "@/components/app-sidebar";
import { Flash } from "@/components/flash";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { isStaff } from "@/lib/grade-lock";
import { Authenticated } from "@/lib/session";

export default function AppLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="flex min-h-screen">
      {/* First Tab stop: past the ~40 menu links straight to the page */}
      <a href="#main" className="fixed top-2 left-2 z-50 -translate-y-20 rounded-lg bg-white px-4 py-2 text-sm font-medium shadow focus:translate-y-0">
        Pular para o conteúdo
      </a>
      <Suspense>
        <Sidebar />
      </Suspense>
      <main id="main" tabIndex={-1} className="min-w-0 flex-1 p-4 pt-18 focus:outline-none lg:p-8">
        <Suspense fallback={<Spinner aria-label="Carregando" />}>
          <Authenticated>{children}</Authenticated>
        </Suspense>
      </main>
      <Suspense>
        <Flash />
      </Suspense>
    </div>
  );
}

/** The menu, with staff-only items when the signed-in user is staff. */
async function Sidebar() {
  const session = await auth.api.getSession({ headers: await headers() });
  return <AppSidebar staff={!!session && (await isStaff(session.user))} />;
}
