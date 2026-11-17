import type { Metadata } from "next";
import { NotFoundMessage } from "@/components/not-found-message";

export const metadata: Metadata = { title: "Página não encontrada" };

/** URLs outside every route: no app shell here, so the message stands alone on the page. */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center p-4">
      <NotFoundMessage />
    </main>
  );
}
