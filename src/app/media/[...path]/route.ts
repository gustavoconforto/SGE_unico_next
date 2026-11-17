import { readFile } from "node:fs/promises";
import path from "node:path";
import { headers } from "next/headers";
import { auth } from "@/lib/auth";
import { MEDIA_TYPES, mediaPath } from "@/lib/media";

// Student photos are personal data: only signed-in staff may load them.
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  if (!(await auth.api.getSession({ headers: await headers() }))) return new Response("Unauthorized", { status: 401 });
  const name = (await ctx.params).path.join("/");
  const type = MEDIA_TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(mediaPath(name));
    return new Response(body, { headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
