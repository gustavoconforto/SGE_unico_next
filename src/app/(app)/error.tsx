"use client";

import { Button } from "flowbite-react";
import Link from "next/link";
import { useEffect } from "react";

/** An unexpected failure while loading or saving: say so plainly, keep the menu, offer a retry. */
export default function AppError({ error, retry }: { error: unknown; retry: () => void }) {
  useEffect(() => {
    console.error(error);
  }, [error]);
  return (
    <div role="alert" className="flex max-w-lg flex-col items-start gap-3">
      <h1 className="text-2xl font-semibold">Não foi possível carregar esta página</h1>
      <p className="text-gray-700">
        Algo deu errado do nosso lado. Tente de novo; se o problema continuar, avise o suporte com o endereço desta página.
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => retry()}>Tentar de novo</Button>
        <Link href="/" className="rounded-lg px-3 py-2.5 text-sm font-medium text-gray-700 underline-offset-4 hover:text-gray-900 hover:underline">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
