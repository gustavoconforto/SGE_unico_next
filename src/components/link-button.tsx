"use client";

import { Button } from "flowbite-react";
import Link from "next/link";
import type { ComponentProps } from "react";

// Server Components can't pass `as={Link}` (a function) to Flowbite's client Button.
type Props = Partial<Pick<ComponentProps<typeof Button>, "color" | "size" | "children" | "className" | "aria-label">> & { href: string; "data-tip"?: string; target?: string; rel?: string };

export function LinkButton({ href, ...props }: Props) {
  return <Button as={Link} href={href} {...props} />;
}
