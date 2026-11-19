"use client";

import { useEffect, useState } from "react";
import { whatsapp } from "@/lib/person";

/**
 * "Abrir conversa no WhatsApp" under a phone. With `field`, it follows what is typed in that input, so an edited
 * number opens before it is saved; hidden while the number isn't a valid Brazilian phone.
 */
export function WhatsAppLink({
  phone,
  field,
  who,
  short,
}: {
  phone?: string | null;
  field?: string;
  who?: string;
  short?: boolean;
}) {
  const [typed, setTyped] = useState<string | null>(null);
  useEffect(() => {
    const input = field
      ? (document.getElementById(field) as HTMLInputElement | null)
      : null;
    if (!input) return;
    const sync = () => setTyped(input.value);
    sync();
    input.addEventListener("input", sync);
    return () => input.removeEventListener("input", sync);
  }, [field]);
  const number = whatsapp(typed ?? phone);
  if (!number) return null;
  return (
    <a
      // wa.me opens the app on phones and WhatsApp Web/Desktop on computers
      href={`https://wa.me/${number}`}
      target="_blank"
      rel="noopener noreferrer"
      className={`${short ? "min-h-11" : "mt-1.5"} inline-flex items-center gap-1 rounded text-sm font-semibold text-green-600 underline-offset-2 hover:text-gray-900 hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary-700`}
    >
      <span className="material-symbols-outlined text-base" aria-hidden="true">
        chat
      </span>
      {short ? "WhatsApp" : "Abrir conversa no WhatsApp"}
      <span className="sr-only">{`${who ? ` com ${who}` : ""} (abre em nova aba)`}</span>
      <span className="material-symbols-outlined text-sm" aria-hidden="true">
        open_in_new
      </span>
    </a>
  );
}
