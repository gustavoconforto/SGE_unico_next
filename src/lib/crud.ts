import { redirect } from "next/navigation";
import type { FlashKey } from "@/components/flash";
import { FOREIGN_KEY_VIOLATION, pgErrorCode } from "./db-error";

/** Port of ProtectedDeleteMixin: runs the delete, then redirects with deleted / protected. */
export async function deleteAndRedirect(remove: () => Promise<unknown>, listPath: string, protectedKey: FlashKey = "protected") {
  let msg: FlashKey = "deleted";
  try {
    await remove();
  } catch (error) {
    if (pgErrorCode(error) !== FOREIGN_KEY_VIOLATION) throw error;
    msg = protectedKey;
  }
  redirect(`${listPath}?msg=${msg}`);
}
