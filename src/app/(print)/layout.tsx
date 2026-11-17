import { Suspense } from "react";
import { Authenticated } from "@/lib/session";

/** Printable documents: no sidebar, white page, still behind the login. */
export default function PrintLayout({ children }: LayoutProps<"/">) {
  return (
    <div className="min-h-screen bg-gray-200 text-gray-900 print:bg-white">
      <Suspense>
        <Authenticated>{children}</Authenticated>
      </Suspense>
    </div>
  );
}
