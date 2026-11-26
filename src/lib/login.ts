// A person's login to this app: a Better Auth user linked by user.employee_id (staff) or user.guardian_id (portal).
// Not SUGA: that's can_access_suga.
import { and, eq, ne } from "drizzle-orm";
import { db } from "@/db";
import { user } from "@/db/schema/auth";
import { auth } from "./auth";
import { type FormErrors, REQUIRED } from "./form";

export type LoginInput = { access: boolean; username: string; password: string };
export type LoginPlan = "create" | "update" | "delete" | "none";

const USERNAME_RE = /^[a-z0-9_.]{3,30}$/; // Better Auth's username plugin rule, lowercased
export const MIN_PASSWORD = 8; // same as create-admin

/**
 * What saving the form does to the login, and why it can't (pure: the action reads the login first).
 * `isSelf`: the login is the signed-in admin's own, who can't lock themselves out.
 */
export function loginPlan(
  input: LoginInput,
  hasLogin: boolean,
  isSelf = false,
): { plan: LoginPlan; errors?: FormErrors } {
  if (isSelf && !input.access)
    return { plan: "none", errors: { access: ["Você não pode remover o seu próprio acesso."] } };
  if (!input.access) return { plan: hasLogin ? "delete" : "none" };
  const errors: FormErrors = {};
  if (!input.username) errors.username = [REQUIRED];
  else if (!USERNAME_RE.test(input.username))
    errors.username = ["Use de 3 a 30 letras sem acento, números, ponto ou _."];
  // On edit a blank password keeps the current one
  if (!input.password && !hasLogin) errors.password = [REQUIRED];
  else if (input.password && input.password.length < MIN_PASSWORD)
    errors.password = [`Use pelo menos ${MIN_PASSWORD} caracteres.`];
  return Object.keys(errors).length ? { plan: "none", errors } : { plan: hasLogin ? "update" : "create" };
}

/** Whose login it is: an employee (roles picked on /employees), or a guardian or student (portal roles). */
export type LoginOwner = { employeeId: number } | { guardianId: number } | { studentId: number };

const ownerWhere = (owner: LoginOwner) =>
  "employeeId" in owner
    ? eq(user.employeeId, owner.employeeId)
    : "guardianId" in owner
      ? eq(user.guardianId, owner.guardianId)
      : eq(user.studentId, owner.studentId);

/** The role a new login starts with: employees get theirs on /employees; portal logins hold no staff resource. */
const ownerRole = (owner: LoginOwner) =>
  "employeeId" in owner ? "user" : "guardianId" in owner ? "responsavel" : "aluno";

export async function ownerLogin(owner: LoginOwner) {
  const [login] = await db
    .select({ id: user.id, username: user.username, role: user.role })
    .from(user)
    .where(ownerWhere(owner));
  return login;
}

export async function usernameTaken(username: string, exceptUserId?: string) {
  const where = exceptUserId
    ? and(eq(user.username, username), ne(user.id, exceptUserId))
    : eq(user.username, username);
  return (await db.select({ id: user.id }).from(user).where(where)).length > 0;
}

/**
 * Applies `plan` through Better Auth (it owns users and password hashing). Runs outside the owner's
 * transaction: Better Auth writes on its own connection.
 */
export async function applyLoginPlan(
  plan: LoginPlan,
  owner: LoginOwner,
  name: string,
  input: LoginInput,
  login: { id: string; username: string | null } | undefined,
) {
  const ctx = await auth.$context;
  // Placeholder address: login is by username; it follows the username so it stays unique
  const email = `${input.username}@gestao.local`;
  const loginId = login?.id;
  if (plan === "create") {
    await auth.api.createUser({
      body: {
        email,
        password: input.password,
        name,
        role: ownerRole(owner),
        // Staff picked this password: its owner replaces it at first sign-in
        data: {
          username: input.username,
          displayUsername: input.username,
          ...owner,
          mustChangePassword: true,
        },
      },
    });
  } else if (plan === "update" && loginId) {
    // Better Auth's username hook rejects a user's own unchanged username as "taken": send it only when it changes
    const renamed =
      input.username !== login!.username ? { email, username: input.username, displayUsername: input.username } : {};
    await ctx.internalAdapter.updateUser(loginId, { name, ...renamed });
    if (input.password) {
      // A reset works like a first access: whoever held the old password is signed out, and the new one must be replaced
      await ctx.internalAdapter.updatePassword(loginId, await ctx.password.hash(input.password));
      await ctx.internalAdapter.updateUser(loginId, { mustChangePassword: true });
      await ctx.internalAdapter.deleteUserSessions(loginId);
    }
  } else if (plan === "delete" && loginId) {
    await ctx.internalAdapter.deleteUser(loginId); // its sessions and password go with it (FK cascade)
  }
}
