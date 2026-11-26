// Roles and what they grant, checked by Better Auth's Admin plugin (src/lib/auth.ts). A user's roles are the
// comma-separated `user.role`; permissions add up across them.
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

const VIEW_EDIT = ["view", "edit"] as const;
const VIEW = ["view"] as const;
const VIEW_EDIT_MANAGE = ["view", "edit", "manage"];

/** Every resource and its actions: the Admin plugin's own (user, session) plus one per area of the system. */
export const statement = {
  ...defaultStatements,
  students: VIEW_EDIT, // students and guardians
  enrollments: VIEW_EDIT,
  finance: VIEW_EDIT,
  payments: VIEW_EDIT,
  payables: VIEW_EDIT, // payable accounts and suppliers (receivables are `finance`)
  grades: VIEW_EDIT_MANAGE, // manage: lock bimesters, enter concept / extra / adjustment grades
  lessons: VIEW_EDIT, // class diary
  timetable: VIEW_EDIT,
  attendance: VIEW_EDIT, // class roll call (pathway roll calls are `pathways`)
  pathways: VIEW_EDIT,
  incidents: VIEW_EDIT, // incidents, delays, bathroom permissions
  employees: VIEW_EDIT,
  enrollmentSetup: VIEW_EDIT,
  academicSetup: VIEW_EDIT,
  releases: VIEW_EDIT,
  programs: VIEW_EDIT,
  qAndA: VIEW_EDIT,
} as const;

export const ac = createAccessControl(statement);

export const roles = {
  admin: ac.newRole(statement),
  user: ac.newRole({}),
  // Guardian portal logins (src/app/(portal)): no staff resource; portal pages scope data by user.guardianId
  responsavel: ac.newRole({}),
  secretaria: ac.newRole({
    students: VIEW_EDIT,
    enrollments: VIEW_EDIT,
    finance: VIEW_EDIT,
    payments: VIEW_EDIT,
    grades: VIEW,
    lessons: VIEW,
    timetable: VIEW_EDIT,
    attendance: VIEW_EDIT,
    pathways: VIEW,
    incidents: VIEW_EDIT,
    enrollmentSetup: VIEW_EDIT,
    academicSetup: VIEW_EDIT,
    releases: VIEW_EDIT,
    programs: VIEW_EDIT,
  }),
  financeiro: ac.newRole({
    students: VIEW,
    enrollments: VIEW,
    finance: VIEW_EDIT,
    payments: VIEW_EDIT,
    payables: VIEW_EDIT,
  }),
  coordenacao: ac.newRole({
    students: VIEW,
    enrollments: VIEW,
    grades: VIEW_EDIT_MANAGE,
    lessons: VIEW_EDIT,
    timetable: VIEW_EDIT,
    attendance: VIEW_EDIT,
    pathways: VIEW_EDIT,
    incidents: VIEW_EDIT,
    academicSetup: VIEW_EDIT,
    releases: VIEW_EDIT,
    qAndA: VIEW_EDIT,
  }),
  professor: ac.newRole({
    grades: VIEW_EDIT,
  }),
};

export type RoleName = keyof typeof roles;

/** The roles an admin picks on /employees ("user" is what a login holds when none is picked). */
export const ROLE_LABELS = {
  admin: "Administrador",
  secretaria: "Secretaria",
  financeiro: "Financeiro",
  coordenacao: "Coordenação",
  professor: "Professor",
} satisfies Partial<Record<RoleName, string>>;
export type AssignableRole = keyof typeof ROLE_LABELS;

/** The roles in a `user.role` string ("admin,secretaria"). */
export const roleList = (role: string | null | undefined) =>
  (role ?? "")
    .split(",")
    .map((r) => r.trim())
    .filter(Boolean);
