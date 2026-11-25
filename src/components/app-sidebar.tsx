"use client";

import { Sidebar, SidebarCollapse, SidebarItem, SidebarItemGroup, SidebarItems } from "flowbite-react";
import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { authClient } from "@/lib/auth-client";
import type { RoleName, statement } from "@/lib/permissions";

type Statement = typeof statement;
/** The resource and action the item's page requires (its requirePermission call); the link shows only to who holds it. */
type Permission = { [R in keyof Statement]: [R, Statement[R][number]] }[keyof Statement];
type NavItem = { href: string; label: string; icon: string; permission: Permission };
type NavGroup = {
  label: string;
  icon: string;
  items: NavItem[];
  groups?: NavGroup[];
};

// Grouped by the staff's tasks, most-used first; Django's menu grouped by app. Add each item when its app is migrated.
export const NAV: NavGroup[] = [
  {
    label: "Secretaria",
    icon: "how_to_reg",
    items: [
      { href: "/students", label: "Alunos", icon: "school", permission: ["students", "view"] },
      { href: "/guardians", label: "Responsáveis", icon: "family_restroom", permission: ["students", "view"] },
      { href: "/enrollments", label: "Matrículas", icon: "how_to_reg", permission: ["enrollments", "view"] },
      { href: "/classes/detail", label: "Alunos da turma", icon: "groups", permission: ["academicSetup", "view"] },
      { href: "/calendar", label: "Calendário", icon: "calendar_month", permission: ["academicSetup", "view"] },
    ],
  },
  {
    label: "Financeiro",
    icon: "receipt_long",
    items: [
      { href: "/accounts/receivable", label: "A receber", icon: "attach_money", permission: ["finance", "view"] },
      { href: "/accounts/payable", label: "A pagar", icon: "money_off", permission: ["finance", "view"] },
      { href: "/accounts/payments", label: "Baixas", icon: "price_check", permission: ["payments", "view"] },
      { href: "/accounts/installments", label: "Parcelas", icon: "balance", permission: ["finance", "view"] },
      {
        href: "/accounts/categories",
        label: "Categoria financeira",
        icon: "category",
        permission: ["finance", "view"],
      },
      { href: "/accounts/suppliers", label: "Fornecedores", icon: "storefront", permission: ["finance", "view"] },
    ],
  },
  {
    label: "Pedagógico",
    icon: "menu_book",
    items: [
      { href: "/grades/entry", label: "Lançamento de notas", icon: "edit_note", permission: ["grades", "edit"] },
      { href: "/grades/student", label: "Notas do aluno", icon: "grading", permission: ["grades", "view"] },
      { href: "/grades/locks", label: "Bloqueio de notas", icon: "lock", permission: ["grades", "manage"] },
      {
        href: "/lessons/timetable",
        label: "Grade horária",
        icon: "calendar_view_week",
        permission: ["lessons", "view"],
      },
      { href: "/lessons/lectures", label: "Diário de classe", icon: "menu_book", permission: ["lessons", "view"] },
      { href: "/q-and-a", label: "Plantões", icon: "support_agent", permission: ["qAndA", "view"] },
    ],
    groups: [
      {
        label: "Itinerários",
        icon: "route",
        items: [
          { href: "/pathways", label: "Criar itinerário", icon: "add_road", permission: ["pathways", "view"] },
          {
            href: "/pathways/offerings",
            label: "Turmas de itinerário",
            icon: "groups",
            permission: ["pathways", "view"],
          },
          { href: "/pathways/enrollments", label: "Inscrições", icon: "how_to_reg", permission: ["pathways", "view"] },
          {
            href: "/pathways/enrollments/by-student",
            label: "Inscrever aluno",
            icon: "person_add",
            permission: ["pathways", "edit"],
          },
          {
            href: "/pathways/sessions",
            label: "Aulas e chamadas",
            icon: "fact_check",
            permission: ["pathways", "view"],
          },
          {
            href: "/pathways/attendance",
            label: "Frequência do aluno",
            icon: "event_available",
            permission: ["pathways", "view"],
          },
          {
            href: "/pathways/workload",
            label: "Carga horária do aluno",
            icon: "schedule",
            permission: ["pathways", "view"],
          },
          { href: "/pathways/grades", label: "Notas de itinerário", icon: "grading", permission: ["pathways", "edit"] },
          { href: "/pathways/extra-grades", label: "Nota extra", icon: "star", permission: ["grades", "manage"] },
        ],
      },
    ],
  },
  {
    label: "Ocorrências",
    icon: "report",
    items: [
      { href: "/incidents", label: "Ocorrências", icon: "report", permission: ["incidents", "view"] },
      { href: "/incidents/delays", label: "Atrasos", icon: "schedule", permission: ["incidents", "view"] },
      { href: "/incidents/bathroom", label: "Saídas para banheiro", icon: "wc", permission: ["incidents", "view"] },
      { href: "/incidents/grades", label: "Notas de conceito", icon: "fact_check", permission: ["grades", "manage"] },
    ],
  },
  {
    label: "Liberações",
    icon: "logout",
    items: [
      { href: "/releases", label: "Liberações", icon: "logout", permission: ["releases", "view"] },
      { href: "/releases/batch", label: "Liberação em lote", icon: "checklist", permission: ["releases", "edit"] },
      { href: "/releases/reasons", label: "Motivos", icon: "list_alt", permission: ["releases", "view"] },
    ],
  },
  {
    label: "Recursos humanos",
    icon: "badge",
    items: [
      { href: "/employees", label: "Funcionários", icon: "badge", permission: ["employees", "view"] },
      { href: "/employees/roles", label: "Cargos", icon: "work", permission: ["employees", "view"] },
    ],
  },
  {
    label: "Configuração de matrícula",
    icon: "settings",
    items: [
      {
        href: "/enrollments/school-years",
        label: "Ano escolar",
        icon: "calendar_month",
        permission: ["enrollmentSetup", "view"],
      },
      { href: "/programs", label: "Cursos oferecidos", icon: "auto_stories", permission: ["programs", "view"] },
      { href: "/enrollments/types", label: "Contratos", icon: "contract", permission: ["enrollmentSetup", "view"] },
      { href: "/enrollments/discounts", label: "Descontos", icon: "percent", permission: ["enrollmentSetup", "view"] },
      {
        href: "/enrollments/documents",
        label: "Documentos",
        icon: "description",
        permission: ["enrollmentSetup", "view"],
      },
    ],
  },
  {
    label: "Cadastros acadêmicos",
    icon: "edit_square",
    items: [
      { href: "/classes", label: "Turmas", icon: "class", permission: ["academicSetup", "view"] },
      { href: "/departments", label: "Departamentos", icon: "groups", permission: ["academicSetup", "view"] },
      { href: "/grades/subjects", label: "Matérias", icon: "menu_book", permission: ["academicSetup", "view"] },
      {
        href: "/grades/level-subjects",
        label: "Matérias por série",
        icon: "library_books",
        permission: ["academicSetup", "view"],
      },
      { href: "/grades/exam-types", label: "Tipos de avaliação", icon: "quiz", permission: ["academicSetup", "view"] },
      { href: "/incidents/types", label: "Tipos de ocorrência", icon: "rule", permission: ["academicSetup", "view"] },
    ],
  },
];

/** Active when on the item's page or below it, unless a longer menu item matches better (/employees vs /employees/roles). */
function isActive(pathname: string, href: string): boolean {
  const matches = (h: string) => pathname === h || pathname.startsWith(`${h}/`);
  if (!matches(href)) return false;
  return !NAV.flatMap(allItems).some((i) => i.href.length > href.length && matches(i.href));
}

function allItems(group: NavGroup): NavItem[] {
  return [...group.items, ...(group.groups ?? []).flatMap(allItems)];
}

/** The menu without the items the role can't open, and without groups left empty. */
// The type takes one role, but checkRolePermission splits "admin,secretaria" on commas like the server does
function visibleNav(groups: NavGroup[], role: RoleName): NavGroup[] {
  return groups
    .map((group) => ({
      ...group,
      items: group.items.filter(({ permission: [resource, action] }) =>
        authClient.admin.checkRolePermission({ role, permissions: { [resource]: [action] } }),
      ),
      groups: group.groups && visibleNav(group.groups, role),
    }))
    .filter((group) => allItems(group).length > 0);
}

function Icon({ name }: { name: string }) {
  return (
    <span className="material-symbols-outlined text-gray-500" aria-hidden="true">
      {name}
    </span>
  );
}

// Flowbite takes a group's icon as a component; one per icon name, made once so React keeps it stable
const GROUP_ICONS = new Map<string, () => React.JSX.Element>();
function groupIcon(name: string) {
  if (!GROUP_ICONS.has(name)) GROUP_ICONS.set(name, () => <Icon name={name} />);
  return GROUP_ICONS.get(name);
}

// Flowbite indents every item inside a collapse by pl-8 regardless of depth, so nesting sets padding itself.
const ITEM_INDENT = ["pl-8", "pl-14"];
const BUTTON_INDENT = ["", "pl-8"];

function NavCollapse({
  group,
  pathname,
  onNavigate,
  depth = 0,
}: {
  group: NavGroup;
  pathname: string;
  onNavigate: () => void;
  depth?: number;
}) {
  return (
    <SidebarCollapse
      label={group.label}
      icon={groupIcon(group.icon)}
      className={BUTTON_INDENT[depth]}
      open={allItems(group).some((item) => isActive(pathname, item.href))}
      renderChevronIcon={() => <Icon name="expand_more" />}
    >
      {group.items.map((item) => (
        <SidebarItem
          key={item.href}
          as={Link}
          href={item.href}
          active={isActive(pathname, item.href)}
          onClick={onNavigate}
          className={ITEM_INDENT[depth]}
        >
          <span className="flex items-center gap-2">
            <Icon name={item.icon} />
            {item.label}
          </span>
        </SidebarItem>
      ))}
      {group.groups?.map((sub) => (
        <NavCollapse key={sub.label} group={sub} pathname={pathname} onNavigate={onNavigate} depth={depth + 1} />
      ))}
    </SidebarCollapse>
  );
}

/** `name` and `role` come from the server session (layout), so the menu renders with the page instead of after a client fetch. */
export function AppSidebar({ name, role }: { name: string; role: string }) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const topBar = useRef<HTMLDivElement>(null);

  // The open drawer is modal: focus moves into it, the page behind is inert (so Tab stays in the drawer),
  // Escape closes it, and closing gives focus back to the button that opened it
  useEffect(() => {
    if (!open) return;
    const drawer = closeButton.current?.closest("nav, aside");
    const opener = menuButton.current;
    const behind = [document.querySelector("main"), topBar.current].filter((el) => el !== null);
    behind.forEach((el) => el.setAttribute("inert", ""));
    closeButton.current?.focus();
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    return () => {
      const hadFocus = drawer?.contains(document.activeElement);
      behind.forEach((el) => el.removeAttribute("inert"));
      document.removeEventListener("keydown", onKey);
      // Only once the bar is no longer inert can its button take focus back
      if (hadFocus) opener?.focus();
    };
  }, [open]);

  async function signOut() {
    await authClient.signOut();
    router.replace("/login");
  }

  return (
    <>
      {/* Phone top bar: the menu button and the school, so the button never floats over the page title */}
      <div
        ref={topBar}
        className="fixed inset-x-0 top-0 z-30 flex h-14 items-center gap-2 border-b border-gray-200 bg-white px-2 lg:hidden"
      >
        <button
          ref={menuButton}
          type="button"
          onClick={() => setOpen(true)}
          className="rounded-lg p-2 hover:bg-gray-100"
          aria-label="Abrir menu"
          aria-expanded={open}
        >
          <Icon name="menu" />
        </button>
        <Link href="/" className="flex items-center gap-2 text-sm font-semibold">
          <Image
            src="/img/unico_logo_pequeno.png"
            alt=""
            width={28}
            height={28}
            className="rounded-md border border-gray-200"
          />
          Único Educacional
        </Link>
      </div>
      {open && <div className="fixed inset-0 z-30 bg-gray-900/40 lg:hidden" onClick={() => setOpen(false)} />}
      {/* invisible when closed below lg: out of the tab order and the accessibility tree, not just off-screen.
          Visibility transitions only on close (visible while sliding out); on open it flips at once so focus can land */}
      <Sidebar
        aria-label="Menu principal"
        className={`fixed inset-y-0 left-0 z-40 w-80 lg:visible lg:sticky lg:top-0 lg:h-screen lg:translate-x-0 ${open ? "translate-x-0 transition-transform" : "invisible -translate-x-full transition-[transform,visibility]"}`}
      >
        <div className="flex h-full flex-col">
          <div className="mb-4 flex items-center gap-2">
            <Link href="/" className="flex flex-1 items-center gap-3 px-2" onClick={() => setOpen(false)}>
              <Image
                src="/img/unico_logo_pequeno.png"
                alt=""
                width={36}
                height={36}
                className="rounded-lg border border-gray-200"
              />
              <span className="leading-tight">
                <span className="block text-sm font-semibold">Único Educacional</span>
                <span className="block text-xs text-gray-600">Gestão escolar</span>
              </span>
            </Link>
            <button
              ref={closeButton}
              type="button"
              onClick={() => setOpen(false)}
              className="rounded-lg p-2 hover:bg-gray-100 lg:hidden"
              aria-label="Fechar menu"
            >
              <Icon name="close" />
            </button>
          </div>
          <SidebarItems className="flex-1 overflow-x-hidden overflow-y-auto">
            <SidebarItemGroup>
              <SidebarItem as={Link} href="/" active={pathname === "/"} onClick={() => setOpen(false)}>
                <span className="flex items-center gap-2">
                  <Icon name="home" />
                  Início
                </span>
              </SidebarItem>
              {visibleNav(NAV, role as RoleName).map((group) => (
                <NavCollapse key={group.label} group={group} pathname={pathname} onNavigate={() => setOpen(false)} />
              ))}
            </SidebarItemGroup>
          </SidebarItems>
          <div className="border-t border-gray-200 pt-3 dark:border-gray-700">
            <p className="truncate px-2 text-sm font-semibold">{name}</p>
            <Link
              href="/account/password"
              onClick={() => setOpen(false)}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Icon name="key" />
              Alterar senha
            </Link>
            <button
              type="button"
              onClick={signOut}
              className="mt-1 flex w-full items-center gap-2 rounded-lg px-2 py-1.5 text-sm hover:bg-gray-100 dark:hover:bg-gray-700"
            >
              <Icon name="logout" />
              Sair
            </button>
          </div>
        </div>
      </Sidebar>
    </>
  );
}
