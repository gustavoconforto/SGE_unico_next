import { readFile } from "node:fs/promises";
import path from "node:path";
import { hasPermission } from "@/lib/authorization";
import { MEDIA_TYPES, mediaPath } from "@/lib/media";

// Student photos are personal data: only staff who may open the student pages (where they show) may load them.
export async function GET(_request: Request, ctx: RouteContext<"/media/[...path]">) {
  if (!(await hasPermission("students", "view"))) return new Response("Forbidden", { status: 403 });
  const name = (await ctx.params).path.join("/");
  const type = MEDIA_TYPES[path.extname(name).toLowerCase()];
  if (!type) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(mediaPath(name));
    return new Response(body, {
      headers: { "Content-Type": type, "Cache-Control": "private, max-age=300", "X-Content-Type-Options": "nosniff" },
    });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
