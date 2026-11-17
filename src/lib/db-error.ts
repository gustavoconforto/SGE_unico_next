type PgError = { code?: unknown; constraint_name?: unknown };

function pgError(error: unknown): PgError | undefined {
  const e = error as PgError & { cause?: PgError };
  return e?.cause?.code ? e.cause : e;
}

/** Postgres SQLSTATE of a failed query (Drizzle wraps the driver error in `cause`). */
export function pgErrorCode(error: unknown): string | undefined {
  const code = pgError(error)?.code;
  return typeof code === "string" ? code : undefined;
}

/** Name of the violated constraint, e.g. "students_student_cpf_key". */
export function pgConstraint(error: unknown): string {
  const name = pgError(error)?.constraint_name;
  return typeof name === "string" ? name : "";
}

export const FOREIGN_KEY_VIOLATION = "23503"; // Django's ProtectedError
export const UNIQUE_VIOLATION = "23505";
