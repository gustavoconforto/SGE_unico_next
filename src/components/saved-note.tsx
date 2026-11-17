import { Announce } from "./announce";

/** After "Registrar e começar outro/outra": names the record just saved, so staff typing in series can check it. */
export function SavedNote({ text }: { text?: string }) {
  if (!text) return null;
  return (
    <>
      <p aria-hidden="true" className="flex items-center gap-2 text-sm font-medium text-green-800">
      <span className="material-symbols-outlined text-green-700" aria-hidden="true">
        check_circle
      </span>
        {text}
      </p>
      <Announce text={text} />
    </>
  );
}

/** The student's name from an enrollment option ("Nome - Curso - Série - Ano") picked by the `last` URL param. */
export const savedStudent = (options: [number, string][], last: string) => options.find(([id]) => String(id) === last)?.[1].split(" - ")[0];
