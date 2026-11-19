// Uploaded files (Django's MEDIA_ROOT). Point MEDIA_ROOT at Django's media/ while both apps run.
import { STUDENT_PLACEHOLDER } from "./students";
import { access, unlink, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

export const MEDIA_ROOT = path.resolve(/*turbopackIgnore: true*/ process.env.MEDIA_ROOT ?? "media");

/** Absolute path of a stored name, refusing anything that escapes MEDIA_ROOT. */
export function mediaPath(name: string): string {
  const full = path.resolve(/*turbopackIgnore: true*/ MEDIA_ROOT, name);
  if (!full.startsWith(MEDIA_ROOT + path.sep)) throw new Error("Invalid media path");
  return full;
}

export const MEDIA_TYPES: Record<string, string> = { ".jpg": "image/jpeg", ".jpeg": "image/jpeg", ".png": "image/png", ".webp": "image/webp" };

// Vercel rejects request bodies over 4.5 MB before the action runs
const MAX_PHOTO_BYTES = 4 * 1024 * 1024;

/** Extension from the file's magic bytes (Django's ImageField checks it really is an image). */
function imageExtension(bytes: Uint8Array): string | undefined {
  const hex = Buffer.from(bytes.subarray(0, 12)).toString("hex");
  if (hex.startsWith("ffd8ff")) return ".jpg";
  if (hex.startsWith("89504e47")) return ".png";
  if (hex.startsWith("52494646") && hex.slice(16, 24) === "57454250") return ".webp";
  return undefined;
}

/** Validates an uploaded photo; returns its bytes and extension, or an error message. */
export async function readPhoto(file: File): Promise<{ bytes: Uint8Array; ext: string } | { error: string }> {
  if (file.size > MAX_PHOTO_BYTES) return { error: "A foto deve ter no máximo 4 MB." };
  const bytes = new Uint8Array(await file.arrayBuffer());
  const ext = imageExtension(bytes);
  return ext ? { bytes, ext } : { error: "Envie uma imagem JPG, PNG ou WebP válida." };
}

/** Saves students/<registration>.<ext> and removes a previous photo with another name. */
export async function saveStudentPhoto(photo: { bytes: Uint8Array; ext: string }, registration: string, oldName: string): Promise<string> {
  const name = `students/${registration}${photo.ext}`;
  await mkdir(path.dirname(mediaPath(name)), { recursive: true });
  await writeFile(mediaPath(name), photo.bytes);
  if (oldName && oldName !== name) await unlink(mediaPath(oldName)).catch(() => {});
  return name;
}

/** Student.photo_url: the stored photo, a file copied in by registration, or the placeholder. */
export async function studentPhotoUrl(photo: string, registration: string): Promise<string> {
  if (photo) return `/media/${photo}`;
  for (const ext of [".jpg", ".jpeg", ".png", ".webp"]) {
    const name = `students/${registration}${ext}`;
    if (await access(mediaPath(name)).then(() => true, () => false)) return `/media/${name}`;
  }
  return STUDENT_PLACEHOLDER;
}
