import type { Run } from "@/lib/enrollment-report";

/** A declaração's paragraphs, with the bold runs bold (server and client: no directive). */
export function Paragraphs({ paragraphs }: { paragraphs: Run[][] }) {
  return paragraphs.map((runs, i) => <p key={i}>{runs.map((r, j) => (r.bold ? <b key={j}>{r.text}</b> : r.text))}</p>);
}
