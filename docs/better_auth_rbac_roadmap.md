# Better Auth RBAC — Implementation Roadmap

## Goal

Implement role-based access control for a **single school** using Next.js App Router and Better Auth's **Admin plugin**, with fixed roles defined in TypeScript and an administration interface to assign or remove permission groups.

## Scope and limitations

- Global roles: `admin` and `user`.
- Departmental permission groups implemented as additional roles: `secretaria`, `coordenacao`, `professor`.
- A user can have multiple roles; permissions are accumulated from their assigned roles.
- An administrator can assign or remove groups using Better Auth's role-management API.
- Permission definitions are fixed in TypeScript. The Admin plugin does **not** provide native per-user permission overrides or a ready-made admin dashboard.
- To edit the permissions *inside* groups at runtime, evaluate the Organization plugin's dynamic access control instead.
- Backend authorization must also be enforced in Django Ninja if its API is directly accessible.

## File structure

```text
src/
├── app/
│   ├── api/auth/[...all]/route.ts
│   ├── (protected)/
│   │   ├── alunos/page.tsx
│   │   ├── notas/page.tsx
│   │   └── admin/usuarios/
│   │       ├── page.tsx
│   │       ├── actions.ts
│   │       └── role-editor.tsx
│   ├── 403/page.tsx
│   └── login/page.tsx
├── lib/
│   ├── auth.ts
│   ├── auth-client.ts
│   ├── permissions.ts
│   └── authorization.ts
└── components/access-denied.tsx
```

## Permission matrix

| Resource/action | Secretaria | Coordenação | Professor |
|---|---|---|---|
| `alunos.read` | Yes | Yes | Yes |
| `alunos.create` | Yes | No | No |
| `alunos.update` | Yes | Yes | No |
| `notas.create` | No | No | Yes |
| `notas.update` | No | Yes | Yes |
| `matriculas.create` | Yes | No | No |
| `financeiro.read` | Yes | No | No |
| `relatorios.export` | No | Yes | No |

The `admin` role receives the necessary system-management permissions and all school resource permissions. The base `user` role has no school-resource permissions until a department group is assigned.

## Phase 1 — Authentication foundation

- [ ] Install Better Auth and configure its database adapter.
- [ ] Configure authentication secrets and environment variables.
- [ ] Enable email/password or the school's preferred sign-in mechanism.
- [ ] Enable the Better Auth Admin plugin.
- [ ] Configure `src/app/api/auth/[...all]/route.ts` using `toNextJsHandler(auth)`.
- [ ] Create `src/lib/auth-client.ts` with `adminClient`.
- [ ] Run the required database migrations.
- [ ] Verify login, logout, session retrieval and unauthorized redirects.

**Acceptance:** Users can sign in and the server can retrieve a validated session.

## Phase 2 — Define fixed roles and permissions

- [ ] Create `src/lib/permissions.ts`.
- [ ] Import `createAccessControl` and the Admin plugin's default statements.
- [ ] Define resources: `alunos`, `notas`, `matriculas`, `financeiro`, `relatorios`.
- [ ] Define allowed actions per resource, such as `create`, `read`, `update`, `delete`, `export`.
- [ ] Create `admin`, `user`, `secretaria`, `coordenacao`, `professor` roles using `ac.newRole()`.
- [ ] Preserve Better Auth's built-in admin/user/session permissions where appropriate.
- [ ] Configure the Admin plugin with `ac`, `roles`, `defaultRole: "user"`, and `adminRoles: ["admin"]`.
- [ ] Verify multiple-role assignment and the resulting combined permissions.

**Acceptance:** A user with `user,secretaria,professor` receives the appropriate permissions from both department groups, without receiving global admin access.

## Phase 3 — Server-side authorization helpers

Create `src/lib/authorization.ts` with:

- [ ] `getCurrentSession()` — validated session retrieval using `auth.api.getSession({ headers: await headers() })`; optionally memoize with React `cache()` for a single render.
- [ ] `isAdmin(): Promise<boolean>` — check whether the authenticated user has the global `admin` role.
- [ ] `hasPermission(resource, action): Promise<boolean>` — evaluate permissions using Better Auth's server-side authorization API.
- [ ] `requireAdmin()` — redirect unauthenticated users to `/login` and unauthorized users to `/403`.
- [ ] `requirePermission(resource, action)` — enforce a granular permission before loading protected data.
- [ ] Type resource/action arguments from the permission statements so invalid combinations fail TypeScript checking.

Example page guard:

```tsx
import { requirePermission } from "@/lib/authorization";

export default async function AlunosPage() {
  await requirePermission("alunos", "read");
  // Fetch protected data only after authorization.
  return <main>Alunos</main>;
}
```

Admin page guard:

```tsx
import { requireAdmin } from "@/lib/authorization";

export default async function AdminPage() {
  await requireAdmin();
  return <main>Administração</main>;
}
```

**Acceptance:** Direct navigation to a protected page cannot bypass the server-side check.

## Phase 4 — Administration interface

Create `src/app/(protected)/admin/usuarios/`:

- [ ] `page.tsx`: call `requireAdmin()` first; list users using Better Auth's Admin API.
- [ ] `role-editor.tsx`: render checkboxes for `secretaria`, `coordenacao`, `professor`.
- [ ] `actions.ts`: implement a Server Action that validates the administrator, validates the target user, and invokes Better Auth's `setRole` API.
- [ ] Always submit the **complete** desired role array; `setRole` replaces assignments.
- [ ] Keep `user` as the base role for non-admin users.
- [ ] Do not allow department editors to assign `admin`.
- [ ] Prevent accidental removal of the last system administrator.
- [ ] Handle concurrent updates, errors, success messages and pagination.
- [ ] Revalidate affected UI after saving.

Example desired assignment:

```ts
["user", "secretaria", "professor"]
```

After removing the professor group:

```ts
["user", "secretaria"]
```

**Acceptance:** An administrator can add/remove departmental groups and the permission changes are enforced on subsequent server requests.

## Phase 5 — Protect every data operation

- [ ] Add `requirePermission()` at the beginning of protected Server Component pages.
- [ ] Repeat authorization inside Server Actions, route handlers and any server-side data-access functions that need protection.
- [ ] Enforce record-level rules separately (e.g., a professor can update grades only for their own classes).
- [ ] Ensure Django Ninja independently validates identity and authorization for protected endpoints; Next.js page guards do not secure a directly callable Django API.
- [ ] Never trust roles or permission flags supplied by the browser.
- [ ] Test removal of permissions with existing browser sessions.
- [ ] Audit administrator role changes.

**Acceptance:** Direct calls to Server Actions, Next.js API routes or Django endpoints cannot bypass authorization.

## Phase 6 — Testing and rollout

- [ ] Unit-test the role/permission matrix.
- [ ] Test users with one, multiple and no departmental groups.
- [ ] Test unauthenticated users and ordinary users accessing `/admin/usuarios`.
- [ ] Test attempts to assign invalid or administrative roles through manipulated requests.
- [ ] Test whether role updates take effect without requiring a new login.
- [ ] Test that permissions are checked server-side, not just used to hide buttons.
- [ ] Verify behavior against the installed Better Auth version and its TypeScript signatures.
- [ ] Deploy to staging and perform a permission review before production.

## Implementation decision

**Start with the Better Auth Admin plugin** when group permissions are fixed in code and administrators only assign or remove groups. This requires no custom RBAC tables, but does require building the UI.

**Consider the Better Auth Organization plugin** if administrators must create new groups or edit each group's permissions at runtime. Its dynamic roles are organization-scoped, which adds a membership model even for a single school.

## Official references

- [Better Auth — Admin plugin](https://www.better-auth.com/docs/plugins/admin)
- [Better Auth — Organization plugin](https://www.better-auth.com/docs/plugins/organization)
- [Better Auth — Next.js integration](https://www.better-auth.com/docs/integrations/next)

> Note: This roadmap is an implementation plan, not a tested application. Validate exact API signatures and multi-role behavior with the installed Better Auth release before production.
