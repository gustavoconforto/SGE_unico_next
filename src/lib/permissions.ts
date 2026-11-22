// Roles and what they grant, checked by Better Auth's Admin plugin (src/lib/auth.ts). A user's roles are the
// comma-separated `user.role`; permissions add up across them.
import { createAccessControl } from "better-auth/plugins/access";
import { defaultStatements } from "better-auth/plugins/admin/access";

const VIEW_EDIT = ["view", "edit"] as const;

/** Every resource and its actions: the Admin plugin's own (user, session) plus one per area of the system. */
export const statement = {
  ...defaultStatements,
  students: VIEW_EDIT, // students and guardians
  enrollments: VIEW_EDIT,
  finance: VIEW_EDIT,
  payments: VIEW_EDIT,
  grades: ["view", "edit", "manage"], // manage: lock bimesters, enter concept / extra / adjustment grades
  lessons: VIEW_EDIT, // timetable, class diary, Q&A sessions
  pathways: VIEW_EDIT,
  incidents: VIEW_EDIT, // incidents, delays, bathroom permissions
  employees: VIEW_EDIT,
  enrollmentSetup: VIEW_EDIT,
  academicSetup: VIEW_EDIT,
  releases: VIEW_EDIT,
} as const;

export const ac = createAccessControl(statement);

const view = ["view"] as const;

export const roles = {
  admin: ac.newRole(statement),
  user: ac.newRole({}),
  secretaria: ac.newRole({
    students: VIEW_EDIT,
    enrollments: VIEW_EDIT,
    finance: VIEW_EDIT,
    payments: VIEW_EDIT,
    grades: view,
    lessons: view,
    pathways: view,
    incidents: VIEW_EDIT,
    employees: VIEW_EDIT,
    enrollmentSetup: VIEW_EDIT,
    academicSetup: VIEW_EDIT,
    releases: VIEW_EDIT,
  }),
  coordenacao: ac.newRole({
    students: view,
    enrollments: view,
    grades: ["view", "edit", "manage"],
    lessons: VIEW_EDIT,
    pathways: VIEW_EDIT,
    incidents: VIEW_EDIT,
    academicSetup: VIEW_EDIT,
    releases: VIEW_EDIT,
  }),
  professor: ac.newRole({
    students: view,
    grades: VIEW_EDIT,
    lessons: VIEW_EDIT,
    pathways: VIEW_EDIT,
    incidents: VIEW_EDIT,
  }),
};

export type RoleName = keyof typeof roles;
