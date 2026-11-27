# Sidebar permissions

What each sidebar item requires and which roles open it. Sources: `NAV` in `src/components/app-sidebar.tsx` (the
item's `[resource, action]`, which hides the link) and `roles` in `src/lib/permissions.ts` (what each role grants).
The page enforces the same check with `requirePermission()`; how that works is in
[docs/permissions.md](docs/permissions.md). Update this file whenever `NAV` or `roles` changes.

A user's roles add up (`user.role = "secretaria,professor"`). `admin` opens everything. `user` (no role picked),
`responsavel` and `aluno` (portal logins) open no item below; portal logins are kept in `/portal`.

Columns: **Adm** admin · **Sec** secretaria · **Fin** financeiro · **Coo** coordenacao · **Pro** professor.

## Always visible

| Item          | Route               | Requires        |
| ------------- | ------------------- | --------------- |
| Início        | `/`                 | a staff session |
| Alterar senha | `/account/password` | a staff session |

## Secretaria

| Item                      | Route              | Permission           | Adm | Sec | Fin | Coo | Pro |
| ------------------------- | ------------------ | -------------------- | :-: | :-: | :-: | :-: | :-: |
| Alunos                    | `/students`        | `students.view`      |  ✓  |  ✓  |  ✓  |  ✓  |     |
| Responsáveis              | `/guardians`       | `students.view`      |  ✓  |  ✓  |  ✓  |  ✓  |     |
| Matrículas                | `/enrollments`     | `enrollments.view`   |  ✓  |  ✓  |  ✓  |  ✓  |     |
| Alunos da turma           | `/classes/detail`  | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Calendário                | `/calendar`        | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Avisos aos responsáveis   | `/alerts`          | `alerts.view`        |  ✓  |  ✓  |     |     |     |
| Recebimento de documentos | `/documents`       | `documents.view`     |  ✓  |  ✓  |     |     |     |
| Tipos de documento        | `/documents/types` | `documents.view`     |  ✓  |  ✓  |     |     |     |

## Financeiro

| Item                 | Route                    | Permission      | Adm | Sec | Fin | Coo | Pro |
| -------------------- | ------------------------ | --------------- | :-: | :-: | :-: | :-: | :-: |
| A receber            | `/accounts/receivable`   | `finance.view`  |  ✓  |  ✓  |  ✓  |     |     |
| A pagar              | `/accounts/payable`      | `payables.view` |  ✓  |     |  ✓  |     |     |
| Baixas               | `/accounts/payments`     | `payments.view` |  ✓  |  ✓  |  ✓  |     |     |
| Parcelas             | `/accounts/installments` | `finance.view`  |  ✓  |  ✓  |  ✓  |     |     |
| Categoria financeira | `/accounts/categories`   | `finance.view`  |  ✓  |  ✓  |  ✓  |     |     |
| Fornecedores         | `/accounts/suppliers`    | `payables.view` |  ✓  |     |  ✓  |     |     |

## Pedagógico

| Item                | Route                       | Permission        | Adm | Sec | Fin | Coo | Pro |
| ------------------- | --------------------------- | ----------------- | :-: | :-: | :-: | :-: | :-: |
| Lançamento de notas | `/grades/entry`             | `grades.edit`     |  ✓  |     |     |  ✓  |  ✓  |
| Notas do aluno      | `/grades/student`           | `grades.view`     |  ✓  |  ✓  |     |  ✓  |  ✓  |
| Bloqueio de notas   | `/grades/locks`             | `grades.manage`   |  ✓  |     |     |  ✓  |     |
| Grade horária       | `/lessons/timetable`        | `timetable.view`  |  ✓  |  ✓  |     |  ✓  |     |
| Diário de classe    | `/lessons/lectures`         | `lessons.view`    |  ✓  |  ✓  |     |  ✓  |     |
| Chamada da turma    | `/lessons/attendance`       | `attendance.edit` |  ✓  |  ✓  |     |  ✓  |     |
| Abono de faltas     | `/lessons/excused-absences` | `attendance.edit` |  ✓  |  ✓  |     |  ✓  |     |
| Plantões            | `/q-and-a`                  | `qAndA.view`      |  ✓  |     |     |  ✓  |     |

### Itinerários

| Item                   | Route                              | Permission      | Adm | Sec | Fin | Coo | Pro |
| ---------------------- | ---------------------------------- | --------------- | :-: | :-: | :-: | :-: | :-: |
| Criar itinerário       | `/pathways`                        | `pathways.view` |  ✓  |  ✓  |     |  ✓  |     |
| Turmas de itinerário   | `/pathways/offerings`              | `pathways.view` |  ✓  |  ✓  |     |  ✓  |     |
| Inscrições             | `/pathways/enrollments`            | `pathways.view` |  ✓  |  ✓  |     |  ✓  |     |
| Inscrever aluno        | `/pathways/enrollments/by-student` | `pathways.edit` |  ✓  |     |     |  ✓  |     |
| Aulas e chamadas       | `/pathways/sessions`               | `pathways.view` |  ✓  |  ✓  |     |  ✓  |     |
| Frequência do aluno    | `/pathways/attendance`             | `pathways.view` |  ✓  |  ✓  |     |  ✓  |     |
| Carga horária do aluno | `/pathways/workload`               | `pathways.view` |  ✓  |  ✓  |     |  ✓  |     |
| Notas de itinerário    | `/pathways/grades`                 | `pathways.edit` |  ✓  |     |     |  ✓  |     |
| Nota extra             | `/pathways/extra-grades`           | `grades.manage` |  ✓  |     |     |  ✓  |     |

## Ocorrências

| Item                 | Route                 | Permission       | Adm | Sec | Fin | Coo | Pro |
| -------------------- | --------------------- | ---------------- | :-: | :-: | :-: | :-: | :-: |
| Ocorrências          | `/incidents`          | `incidents.view` |  ✓  |  ✓  |     |  ✓  |     |
| Atrasos              | `/incidents/delays`   | `incidents.view` |  ✓  |  ✓  |     |  ✓  |     |
| Saídas para banheiro | `/incidents/bathroom` | `incidents.view` |  ✓  |  ✓  |     |  ✓  |     |
| Notas de conceito    | `/incidents/grades`   | `grades.manage`  |  ✓  |     |     |  ✓  |     |

## Liberações

| Item              | Route               | Permission      | Adm | Sec | Fin | Coo | Pro |
| ----------------- | ------------------- | --------------- | :-: | :-: | :-: | :-: | :-: |
| Liberações        | `/releases`         | `releases.view` |  ✓  |  ✓  |     |  ✓  |     |
| Liberação em lote | `/releases/batch`   | `releases.edit` |  ✓  |  ✓  |     |  ✓  |     |
| Motivos           | `/releases/reasons` | `releases.view` |  ✓  |  ✓  |     |  ✓  |     |

## Recursos humanos

| Item         | Route              | Permission       | Adm | Sec | Fin | Coo | Pro |
| ------------ | ------------------ | ---------------- | :-: | :-: | :-: | :-: | :-: |
| Funcionários | `/employees`       | `employees.view` |  ✓  |     |     |     |     |
| Cargos       | `/employees/roles` | `employees.view` |  ✓  |     |     |     |     |

The sidebar checks `employees.view` (only `admin` holds it); both pages call `requireAdmin()` instead of
`requirePermission()`.

## Configuração de matrícula

| Item              | Route                       | Permission             | Adm | Sec | Fin | Coo | Pro |
| ----------------- | --------------------------- | ---------------------- | :-: | :-: | :-: | :-: | :-: |
| Ano escolar       | `/enrollments/school-years` | `enrollmentSetup.view` |  ✓  |  ✓  |     |     |     |
| Cursos oferecidos | `/programs`                 | `programs.view`        |  ✓  |  ✓  |     |     |     |
| Contratos         | `/enrollments/types`        | `enrollmentSetup.view` |  ✓  |  ✓  |     |     |     |
| Descontos         | `/enrollments/discounts`    | `enrollmentSetup.view` |  ✓  |  ✓  |     |     |     |
| Documentos        | `/enrollments/documents`    | `enrollmentSetup.view` |  ✓  |  ✓  |     |     |     |

## Cadastros acadêmicos

| Item                | Route                    | Permission           | Adm | Sec | Fin | Coo | Pro |
| ------------------- | ------------------------ | -------------------- | :-: | :-: | :-: | :-: | :-: |
| Turmas              | `/classes`               | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Departamentos       | `/departments`           | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Matérias            | `/grades/subjects`       | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Matérias por série  | `/grades/level-subjects` | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Tipos de avaliação  | `/grades/exam-types`     | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |
| Tipos de ocorrência | `/incidents/types`       | `academicSetup.view` |  ✓  |  ✓  |     |  ✓  |     |

## Editing inside a screen

Opening a screen needs the permission above. Creating, editing and deleting need `edit` on the same resource,
because every Server Action calls `requirePermission(resource, "edit")`. These roles can open the screens of the
resources below but not change them:

| Role        | View only                 |
| ----------- | ------------------------- |
| secretaria  | `grades`, `pathways`      |
| financeiro  | `students`, `enrollments` |
| coordenacao | `students`, `enrollments` |
