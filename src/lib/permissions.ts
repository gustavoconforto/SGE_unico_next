// What a group can grant, and which permission each page needs. Not in Django: its permissions were never checked.
// Pure (no db) so the proxy, the sidebar and tests share it; who holds what is in access.ts.

/** Areas of the system, each with a view and an edit permission ("students.view", "students.edit"). */
export const AREAS = [
  ["students", "Alunos e responsáveis"],
  ["enrollments", "Matrículas"],
  ["finance", "Financeiro"],
  // Split from finance: the enrollment desk takes the first payment at signing without seeing the whole book
  ["payments", "Baixas"],
  ["grades", "Notas"],
  ["lessons", "Grade horária, diário de classe e plantões"],
  ["pathways", "Itinerários"],
  ["incidents", "Ocorrências, atrasos e saídas"],
  ["employees", "Funcionários e cargos"],
  ["enrollmentSetup", "Configuração de matrícula"],
  ["academicSetup", "Cadastros acadêmicos"],
] as const;

/** Permissions beyond view/edit. */
export const EXTRA_PERMISSIONS = [
  // What isStaff() used to decide: lock bimesters, edit locked bimesters and the C / EX / A grades
  ["grades.manage", "Notas: bloquear bimestres e lançar notas de conceito, extra e ajuste"],
] as const;

export type Area = (typeof AREAS)[number][0];
export type Permission = `${Area}.${"view" | "edit"}` | (typeof EXTRA_PERMISSIONS)[number][0];

/** Every permission with its label, in display order. */
export const PERMISSIONS: readonly (readonly [Permission, string])[] = [
  ...AREAS.flatMap(([area, label]) => [[`${area}.view`, `${label}: ver`] as const, [`${area}.edit`, `${label}: cadastrar, editar e excluir`] as const]),
  ...EXTRA_PERMISSIONS,
];
const CODES = new Set<string>(PERMISSIONS.map(([code]) => code));
export const isPermission = (code: string): code is Permission => CODES.has(code);

/** Any signed-in user may open these. */
const OPEN = ["/", "/account/password", "/forbidden", "/media"];

/** No group can grant this: only admins hold it (who edits groups could otherwise grant themselves anything). */
export const ADMIN = "admin";
type Needed = Permission | typeof ADMIN;

/**
 * Path prefix → the permission its pages need; the longest matching prefix wins. A `.view` permission becomes
 * `.edit` on form pages (…/new, …/edit). Paths matching nothing are denied: add each new screen here.
 */
const ROUTES: [string, Needed][] = [
  ["/students", "students.view"],
  ["/guardians", "students.view"],
  ["/enrollments", "enrollments.view"],
  ["/classes/detail", "enrollments.view"],
  ["/accounts", "finance.view"],
  ["/accounts/payments", "payments.view"],
  ["/accounts/payments/batch", "payments.edit"],
  ["/grades/entry", "grades.edit"],
  ["/grades/student", "grades.view"],
  ["/grades/report-card", "grades.view"],
  ["/grades/locks", "grades.manage"],
  ["/lessons", "lessons.view"],
  ["/lessons/lectures/day", "lessons.edit"],
  ["/q-and-a", "lessons.view"],
  ["/pathways", "pathways.view"],
  ["/pathways/enrollments/by-student", "pathways.edit"],
  ["/incidents", "incidents.view"],
  ["/employees", "employees.view"],
  ["/enrollments/school-years", "enrollmentSetup.view"],
  ["/enrollments/types", "enrollmentSetup.view"],
  ["/enrollments/discounts", "enrollmentSetup.view"],
  ["/enrollments/documents", "enrollmentSetup.view"],
  ["/programs", "enrollmentSetup.view"],
  ["/classes", "academicSetup.view"],
  ["/departments", "academicSetup.view"],
  ["/grades/subjects", "academicSetup.view"],
  ["/grades/level-subjects", "academicSetup.view"],
  ["/grades/exam-types", "academicSetup.view"],
  ["/incidents/types", "academicSetup.view"],
  ["/groups", ADMIN],
];

const under = (path: string, prefix: string) => path === prefix || path.startsWith(`${prefix}/`);
const FORM_PAGE = /\/(new|edit)(\/|$)/;

/** The permission a page needs: null when any signed-in user may open it, undefined when no rule covers it (deny). */
export function routePermission(path: string): Needed | null | undefined {
  if (OPEN.some((p) => (p === "/" ? path === "/" : under(path, p)))) return null;
  let best: [string, Needed] | undefined;
  for (const route of ROUTES) if (under(path, route[0]) && (!best || route[0].length > best[0].length)) best = route;
  if (!best) return undefined;
  const [, permission] = best;
  return FORM_PAGE.test(path) && permission.endsWith(".view") ? (permission.replace(/\.view$/, ".edit") as Permission) : permission;
}

/** May a holder of `granted` open `path`? `all`: an admin, who holds every permission. */
export function canOpen(path: string, granted: ReadonlySet<string>, all = false): boolean {
  const needed = routePermission(path);
  if (needed === null) return true;
  return all || (needed !== undefined && needed !== ADMIN && granted.has(needed));
}
