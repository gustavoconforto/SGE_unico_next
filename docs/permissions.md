# How the permission system works

The system works in five layers. A request passes through them in this order: 
1 - who you are  
2 - what you hold 
3 - can you open the page 
4 - what the page shows 
5 - can you run the action

## 1. The data model: who holds what

```
user (Better Auth) ──employeeId──▶ employees_employee ──roleId──▶ employeeroletype (Cargo)
                                                                     ▲
                                         access_group_roles ─────────┘
access_group (Grupo) ─┤
                      └── access_group_permissions.codename  ("students.view", "grades.manage", …)
```

| Piece | Path | What it does |
|---|---|---|
| `user.role` / `user.employeeId` | `src/lib/auth.ts` | Better Auth's `admin()` plugin supplies `role`. `"admin"` means the user holds every permission. `employeeId` is an extra field that links the login to an employee. A login with no employee holds no permissions. |
| `accessGroup` | `src/db/schema/app.ts` | A named group, for example "Secretaria". |
| `accessGroupRoles` | `src/db/schema/app.ts` | Links groups to employee roles (many-to-many). Rows are deleted automatically when the group is deleted. |
| `accessGroupPermissions` | `src/db/schema/app.ts` | The permission codes a group grants. |

## 2. The catalog: `src/lib/permissions.ts` (pure, no database)

This file makes no database calls, so the proxy, the sidebar and the tests can all use it.

| Name | What it does |
|---|---|
| `AREAS` | The areas. Each one produces two permissions, `<area>.view` and `<area>.edit`. |
| `EXTRA_PERMISSIONS` | Permissions beyond view/edit. Right now there is only `grades.manage` (lock bimesters and enter C / EX / A grades). |
| `Permission` (type) | The union of every valid permission code. |
| `PERMISSIONS` | Every code with its Portuguese label, used by the group form's checkboxes. |
| `isPermission(code)` | Filters out codes the system doesn't know. `saveGroup` uses it so a tampered form can't store them. |
| `OPEN` | Paths any signed-in user can open: `/`, `/account/password`, `/forbidden`, `/media`. |
| `ADMIN` | A sentinel for routes only admins can open (`/groups`). No group can grant it, which stops a group editor from granting themselves everything. |
| `ROUTES` | Maps a path prefix to the permission it needs. **The longest matching prefix wins.** A path with no match is denied to everyone except admins. |
| `routePermission(path)` | Returns `null` for open paths, `undefined` when no route matches (deny), or the permission needed. On form pages (`/new`, `/edit`) it upgrades `.view` to `.edit`. |
| `canOpen(path, granted, all)` | Decides whether a user can open a page: `routePermission` plus the user's granted set, with admins (`all`) allowed everywhere. |

## 3. Loading what a user holds: `src/lib/access.ts` (database)

| Name | What it does |
|---|---|
| `Access` (type) | `{ all: boolean; granted: Set<string> }` |
| `loadAccess(admin, employeeId)` | Wrapped in React `cache()`, so it **runs once per request** even though the proxy, layout, page and action all ask. Admins get `{all: true}`. A user with no employee gets an empty set. Everyone else gets one query: employee → role → group roles → group permissions. |
| `userAccess(user)` | Public entry point. Turns a session user into the arguments for `loadAccess`. |
| `hasPermission(user, perm)` | Returns a boolean. Pages use it to show or hide parts of the UI. |
| `requirePermission(perm)` | **The gate for Server Actions.** It calls `requireSession()`; no session redirects to `/login`, and a missing permission redirects to `/forbidden`. |
| `requireAdmin()` | Admin-only actions (the groups screen). |

`requireSession()` and the `Authenticated` wrapper live in `src/lib/session.ts`. They check the session only, not
permissions.

## 4. The call sequence for one request

```
Browser GET /students/12/edit
│
├─① src/proxy.ts → proxy(request)                       [before any page renders]
│   ├─ auth.api.getSession()          no session → redirect /login?next=…
│   ├─ mustChangePassword?            → redirect /account/password
│   ├─ routePermission(path) === null → open path, NextResponse.next()
│   ├─ userAccess(session.user)       → loadAccess() (DB query, cached)
│   └─ canOpen(path, granted, all)    false → rewrite to /forbidden (URL stays the same)
│                                      "/students/12/edit" → "students.view" upgraded to "students.edit"
│
├─② src/app/(app)/layout.tsx → AppLayout
│   ├─ <Sidebar> → userAccess() → <AppSidebar all granted>
│   │     src/components/app-sidebar.tsx: visibleNav() filters NAV using canOpen()
│   │     → menu items the user can't open are hidden
│   └─ <Authenticated> → requireSession()   (a second check alongside the proxy)
│
├─③ page.tsx (optional UI decisions)
│   └─ hasPermission(user, "...")    e.g. students/page.tsx hides "Novo aluno" without students.edit
│                                    grades/entry/page.tsx → "staff" = grades.manage → gradeEditError()
│                                    accounts/payments/new/page.tsx → payments.view
│
└─④ Form submit → Server Action (actions.ts)
    └─ requirePermission("<area>.edit")  first line of every action
          no session → /login, missing permission → /forbidden
       (groups/actions.ts uses requireAdmin() instead)
```

Server Actions are POST requests to the page's own URL, so the proxy (①) checks them too. Each action still checks
its own permission, because an action could be invoked from a page with a weaker rule.

## 5. Managing permissions: `/groups` (admin only)

| Name | Path | What it does |
|---|---|---|
| `GroupListPage` | `src/app/(app)/groups/page.tsx` | Lists the groups. |
| `GroupForm` | `src/app/(app)/groups/group-form.tsx` | Name field, role checkboxes and the `PERMISSIONS` checkboxes. |
| `saveGroup(id, prev, formData)` | `src/app/(app)/groups/actions.ts` | Calls `requireAdmin()`, keeps only valid codes with `isPermission()`, then in one transaction deletes the group's role and permission links and inserts the new ones. |
| `deleteGroup(id)` | `src/app/(app)/groups/actions.ts` | Calls `requireAdmin()` and deletes the group; its role and permission links are deleted with it. |

The `/forbidden` page (`src/app/(app)/forbidden/page.tsx`) is shown in two cases: the proxy rewrites a blocked page
to it, and `requirePermission()` redirects there when an action is denied.

## Adding a new screen

1. Add the page to `NAV` (`src/components/app-sidebar.tsx`) **and** to `ROUTES` (`src/lib/permissions.ts`).
2. If no area fits, add one to `AREAS`. It then shows up automatically in the group form.
3. Start every action in its `actions.ts` with `requirePermission("<area>.edit")`.
4. Use `hasPermission()` in the page if parts of the UI depend on a permission.

Tests: `src/lib/permissions.test.ts` covers route resolution and `src/lib/access.test.ts` covers loading.
