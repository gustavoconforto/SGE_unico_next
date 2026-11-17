// Shared by the server header and the client rows (a "use client" module can't export plain values to the server).
/** First column of a group (bimester, annual results): a hairline divider. */
export const GROUP = "border-l border-gray-200 dark:border-gray-700";
/** A computed grade column (bimester "Nota", "Média final"): a faint tint so results read apart from exam scores. */
export const RESULT = "bg-gray-50 dark:bg-gray-900/40";
/** Exam score columns keep their edit-mode width (a 40px input), so "Editar" doesn't widen the table. */
export const SCORE = "min-w-11";
/** Subject column stays visible while the table scrolls sideways (header cells already have a background). */
export const STICKY = "sticky left-0 z-10 shadow-[1px_0_0_var(--color-gray-200)] dark:shadow-[1px_0_0_var(--color-gray-700)]";
/** Body rows are transparent over Flowbite's backdrop, so the sticky cell paints that backdrop and the row hover itself. */
export const STICKY_BODY = `${STICKY} bg-white group-hover/row:bg-gray-50 dark:bg-black dark:group-hover/row:bg-gray-600`;
