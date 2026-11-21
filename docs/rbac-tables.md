# RBAC tables: current state

Snapshot of the dev database (`gestao-pg`) on 2026-11-21, branch `rbac`, before the rewrite.
Source of truth: `src/db/schema/auth.ts`, `src/db/schema/app.ts`, plus `\d` output from Postgres.

## How the pieces connect

```
user (Better Auth) ──employee_id──▶ employees_employee ──role_id──▶ employees_employeeroletype
   │ role = 'admin' → everything                                         ▲
   │                                                                     │ role_id
   ├─▶ session (user_id)                         access_group_roles ─────┘
   └─▶ account (user_id, holds password hash)        │ group_id
                                                     ▼
                                               access_group ◀── group_id ── access_group_permissions (codename)
```

Resolution (`src/lib/access.ts`, `loadAccess`):

1. `user.role = 'admin'`: holds every permission.
2. `user.employee_id` is null: holds nothing.
3. Otherwise: `employee.role_id` → every `access_group_roles` row with that role → every `codename` in those groups.

Permissions go to the **role** (cargo), not to the person. Two employees with the same role always have the same access.

Enforcement today: commit `bb0a52c` removed RBAC from the proxy, actions and pages. `requirePermission` / `requireAdmin`
are still called only in `src/app/(app)/groups/actions.ts` and `src/app/(app)/forbidden/page.tsx`.

## Row counts (dev)

| Table | Rows |
|---|---|
| `user` | 4 (`admin`, `conforto`: role `admin`; `teste`: role `user`, employee 146; `secretaria`: role `user`, no employee) |
| `employees_employee` | 11 |
| `employees_employeeroletype` | 3 (`1 Professor`, `2 Coordenação`, `3 Secretaria`) |
| `access_group` | 1 (`staff`) |
| `access_group_roles` | 1 (`staff` → role 3 Secretaria) |
| `access_group_permissions` | 2 (`staff`: `students.view`, `students.edit`) |

---

## Better Auth tables (`src/db/schema/auth.ts`)

Better Auth owns these. Create users with `auth.api.createUser` (admin plugin), never with direct inserts.
Plugins: `username()`, `admin()`, `nextCookies()`; `disableSignUp: true`; rate limit stored in the database.
Timestamps are `timestamp without time zone` with `now()` defaults, unlike the Django tables.

### `user`

| Column | Type | Null | Default | Notes |
|---|---|---|---|---|
| `id` | text | no | | PK |
| `name` | text | no | | employee's name when linked |
| `email` | text | no | | unique; placeholder `<username>@gestao.local` |
| `email_verified` | boolean | no | `false` | |
| `image` | text | yes | | |
| `created_at` | timestamp | no | `now()` | |
| `updated_at` | timestamp | no | `now()` | `$onUpdate` |
| `username` | text | yes | | unique; login is by username (`/^[a-z0-9_.]{3,30}$/`) |
| `display_username` | text | yes | | |
| `role` | text | yes | | admin plugin: `'admin'` or `'user'`. **The only admin flag** |
| `banned` | boolean | yes | `false` | admin plugin |
| `ban_reason` | text | yes | | admin plugin |
| `ban_expires` | timestamp | yes | | admin plugin |
| `employee_id` | bigint | yes | | **custom**. Unique, FK → `employees_employee.id` **ON DELETE CASCADE**. Null for logins made by `create-admin` |
| `must_change_password` | boolean | no | `false` | **custom**. Proxy keeps the user on `/account/password` until it's false |

Constraints: `user_pkey`, `user_email_unique`, `user_username_unique`, `user_employee_id_unique`,
`user_employee_id_employees_employee_id_fk`.

### `session`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | no | PK |
| `expires_at` | timestamp | no | |
| `token` | text | no | unique |
| `created_at` / `updated_at` | timestamp | no | |
| `ip_address` / `user_agent` | text | yes | |
| `user_id` | text | no | FK → `user.id` ON DELETE CASCADE; index `session_userId_idx` |
| `impersonated_by` | text | yes | admin plugin |

### `account`

Credentials per provider. The password hash is in `password` (provider `credential`).

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | text | no | PK |
| `account_id` / `provider_id` | text | no | |
| `user_id` | text | no | FK → `user.id` ON DELETE CASCADE; index `account_userId_idx` |
| `access_token`, `refresh_token`, `id_token`, `scope`, `password` | text | yes | |
| `access_token_expires_at`, `refresh_token_expires_at` | timestamp | yes | |
| `created_at` / `updated_at` | timestamp | no | |

### `verification`, `rate_limit`

Internal to Better Auth, never touched by app code. `verification(id, identifier, value, expires_at, created_at,
updated_at)`; `rate_limit(id, key unique, count, last_request bigint)`.

---

## Employee tables (from Django; keep names)

### `employees_employeeroletype` (cargo, "role" in the RBAC)

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | bigint identity | no | PK |
| `role` | varchar(20) | no | label; **not unique** |

Referenced by `employees_employee.role_id` (no cascade) and `access_group_roles.role_id` (CASCADE).

### `employees_employee`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | bigint identity | no | PK |
| `created_at` / `updated_at` | timestamptz | no | no DB default (`$defaultFn` / `$onUpdate`) |
| `name` | varchar(200) | no | |
| `sex` | varchar(1) | no | |
| `cpf` | varchar(11) | no | unique (`employees_employee_cpf_key` + partial `employees_employee_unique_cpf` where cpf <> '') |
| `rg` | varchar(20) | no | unique |
| `issuing_authority` | varchar(20) | no | |
| `birth_date` | date | yes | |
| `nationality`, `place_of_birth` | varchar(50) | no | |
| `phone`, `mobile` | varchar(20) | no | |
| `email` | varchar(254) | no | |
| `address` | varchar(200) | no | |
| `neighborhood`, `city` | varchar(100) | no | |
| `state` | varchar(2) | no | |
| `zip_code` | varchar(8) | no | |
| `can_access_suga` | boolean | no | access to SUGA (another system), **not** this app |
| `password_suga` | varchar(128) | no | SUGA password, not used for login here |
| `role_id` | bigint | no | FK → `employees_employeeroletype.id`; **exactly one role per employee** |

Referenced by `user.employee_id` (CASCADE) and the teacher links below (no cascade:
`employees/actions.ts` deletes them first in the same transaction).

---

## Access tables (not in Django; added for this RBAC)

### `access_group`

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | bigint identity | no | PK |
| `name` | varchar(150) | no | unique |

### `access_group_roles` (group ↔ role, M2M)

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | bigint identity | no | PK |
| `group_id` | bigint | no | FK → `access_group.id` ON DELETE CASCADE |
| `role_id` | bigint | no | FK → `employees_employeeroletype.id` ON DELETE CASCADE; index `access_group_roles_role_id_idx` |

Unique `(group_id, role_id)`.

### `access_group_permissions` (group → permission code)

| Column | Type | Null | Notes |
|---|---|---|---|
| `id` | bigint identity | no | PK |
| `group_id` | bigint | no | FK → `access_group.id` ON DELETE CASCADE |
| `codename` | varchar(50) | no | free text in the DB; valid codes are only checked in code (`isPermission`) |

Unique `(group_id, codename)`. There is **no permission table**: the catalog lives in `src/lib/permissions.ts`.

#### Permission catalog (`src/lib/permissions.ts`)

`<area>.view` and `<area>.edit` for each area, plus `grades.manage`:

| Area | Label |
|---|---|
| `students` | Alunos e responsáveis |
| `enrollments` | Matrículas |
| `finance` | Financeiro |
| `payments` | Baixas |
| `grades` | Notas |
| `lessons` | Grade horária, diário de classe e plantões |
| `pathways` | Itinerários |
| `incidents` | Ocorrências, atrasos e saídas |
| `employees` | Funcionários e cargos |
| `enrollmentSetup` | Configuração de matrícula |
| `academicSetup` | Cadastros acadêmicos |
| `releases` | Liberações |
| *(extra)* `grades.manage` | lock bimesters; enter C / EX / A grades |

`ADMIN` (`/groups`) can't be granted by any group, only by `user.role = 'admin'`.
`ROUTES` maps path prefixes to codes (longest prefix wins, `.view` becomes `.edit` on `/new` and `/edit` pages,
unlisted paths are denied). Open to every signed-in user: `/`, `/account/password`, `/forbidden`, `/media`.

---

## Teacher assignment tables (row-level scope candidates)

These link employees to what they teach. Today they only feed forms and lists. **No code filters data by the
signed-in employee** (no row-level scope yet).

| Table | Columns | Unique | FKs |
|---|---|---|---|
| `departments_department_teachers` | `id`, `department_id`, `employee_id` | `(department_id, employee_id)` | → `departments_department`, → `employees_employee` |
| `grades_gradelevelsubject_teachers` | `id`, `gradelevelsubject_id`, `employee_id` | `(gradelevelsubject_id, employee_id)` | → `grades_gradelevelsubject`, → `employees_employee` |
| `pathways_pathwayoffering_teachers` | `id`, `pathwayoffering_id`, `employee_id` | `(pathwayoffering_id, employee_id)` | → `pathways_pathwayoffering`, → `employees_employee` |
| `lessons_lecture` | `teacher_id` column | | → `employees_employee` |
| `lessons_timetableslot` | `teacher_id` column | | → `employees_employee` |

None of these FKs cascade.

## Things to keep in mind for the rewrite

- Admin is decided by Better Auth's `user.role`, separately from groups. Two sources of truth.
- One role per employee (`role_id NOT NULL`), so per-person exceptions aren't possible today.
- `codename` has no FK or check. Renaming a code in `permissions.ts` silently orphans rows.
- Deleting an employee deletes its login (cascade). Deleting a role cascades its group links, but fails while
  employees still use it.
- Migrations: Drizzle owns every table (`npm run db:generate`). Production (Neon) runs only `db:migrate`, before the
  code that needs it.
- Related docs: `docs/permissions.md`, `docs/better_auth_rbac_roadmap.md`.
