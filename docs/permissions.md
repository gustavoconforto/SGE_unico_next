# How the permission system works

Not in Django (its groups held users and were never checked). Roles live in code, in Better Auth's Admin plugin.
A request passes these layers in order: who you are → what your roles grant → can you open the page → what the page
shows → can you run the action.

## 1. Who holds what

```
user (Better Auth) ── role: "secretaria,professor" (comma-separated) ──▶ roles in src/lib/permissions.ts
```

- `user.role` holds one or more role names; their permissions add up. `"admin"` holds everything; a login with no
  role picked is plain `"user"`, which holds nothing.
- Roles are assigned on `/employees` (admins only): the role multiselect calls `setUserRoles()`
  (`src/app/(app)/employees/actions.ts`) → `auth.api.setRole`. An admin can't remove their own `admin` role.
- The employee's job role (`employees_employeeroletype`, "Cargo") is just a record field; it grants nothing.

## 2. The catalog: `src/lib/permissions.ts` (pure, no database)

| Name             | What it does                                                                                                                                                                                                                                                                 |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `statement`      | Every resource and its actions: Better Auth's own (`user`, `session`) plus one per area (`students`, `finance` (receivables), `payables` (payable accounts, suppliers), `grades`, …), each with `view` / `edit`; `grades` adds `manage` (lock bimesters, C / EX / A grades). |
| `ac`, `roles`    | The access control and the roles (`admin`, `user`, `secretaria`, `financeiro`, `coordenacao`, `professor`), passed to the Admin plugin in `src/lib/auth.ts` and `src/lib/auth-client.ts`.                                                                                    |
| `ROLE_LABELS`    | The roles an admin can pick, with Portuguese labels.                                                                                                                                                                                                                         |
| `roleList(role)` | Splits a `user.role` string into role names.                                                                                                                                                                                                                                 |

## 3. The checks: `src/lib/authorization.ts` (server only)

| Name                                  | What it does                                                                                                    |
| ------------------------------------- | --------------------------------------------------------------------------------------------------------------- |
| `hasPermission(resource, action)`     | Boolean, via `auth.api.userHasPermission`. Pages use it to show or hide parts of the UI.                        |
| `requirePermission(resource, action)` | **First line of every page and every Server Action.** No session → `/login`, missing permission → `/forbidden`. |
| `requireAdmin()`                      | Same, for admin-only screens and actions (`/employees`: logins, passwords, roles).                              |

`getCurrentSession()` (cached once per request), `requireSession()` and `<Authenticated>` live in
`src/lib/session.ts` and check the session only.

## 4. One request

```
Browser GET /students/12/edit
├─① src/proxy.ts            no session → /login?next=…; mustChangePassword → /account/password
├─② (app)/layout.tsx         <Authenticated> → requireSession()
│   └─ <AppSidebar>          each NAV item has a [resource, action]; hidden when the user's roles lack it
├─③ page.tsx                 requirePermission("students", "edit"), then hasPermission(...) for optional UI
└─④ Server Action            requirePermission("students", "edit") first (employees: requireAdmin())
```

The proxy checks only the session; each page and action checks its own permission.

## Adding a new screen

1. Add the page to `NAV` (`src/components/app-sidebar.tsx`) with its `[resource, action]`.
2. If no resource fits, add one to `statement` and grant it in `roles`.
3. Start the page with `requirePermission(resource, "view" | "edit")` and every action with
   `requirePermission(resource, "edit")`.

Tests: `src/lib/permissions.test.ts` checks what each role grants.
