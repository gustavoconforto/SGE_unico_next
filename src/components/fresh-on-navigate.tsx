"use client";

import { usePathname } from "next/navigation";
import { Fragment } from "react";

/**
 * Cache Components keep visited pages mounted (hidden in React <Activity>), so a form opened again showed the
 * values and errors of its last visit instead of the saved data, until F5. Keyed on the path, every page change
 * mounts the page fresh from the server's data; search-param changes (list search, pagination, ?msg=) keep it.
 * shortcut: browser back/forward no longer restores a half-typed form either; key forms on
 * useRouter().bfcacheId one by one if drafts must survive Back.
 */
export function FreshOnNavigate({ children }: { children: React.ReactNode }) {
  return <Fragment key={usePathname()}>{children}</Fragment>;
}
