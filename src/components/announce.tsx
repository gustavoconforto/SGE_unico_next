"use client";

import { useEffect, useState } from "react";

/**
 * A screen-reader announcement for a page that just loaded: a live region that arrives with its text is not read out,
 * so the text goes in once the page (and any autofocus) has settled.
 */
export function Announce({ text }: { text: string }) {
  const [shown, setShown] = useState("");
  useEffect(() => {
    const timer = setTimeout(() => setShown(text), 500);
    return () => clearTimeout(timer);
  }, [text]);
  return (
    <p role="status" className="sr-only">
      {shown}
    </p>
  );
}
