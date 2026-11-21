import { readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { NAV } from "@/components/app-sidebar";
import { PERMISSIONS, canOpen, isPermission, routePermission } from "./permissions";

describe("routePermission", () => {
  it("lets any signed-in user open home, password, forbidden and media", () => {
    for (const path of ["/", "/account/password", "/forbidden", "/media/students/a.jpg"]) expect(routePermission(path)).toBeNull();
  });

  it("asks view on lists and edit on form pages", () => {
    expect(routePermission("/students")).toBe("students.view");
    expect(routePermission("/students/new")).toBe("students.edit");
    expect(routePermission("/students/12/edit")).toBe("students.edit");
    expect(routePermission("/students/12")).toBe("students.view");
    expect(routePermission("/accounts/receivable/3/receipt")).toBe("finance.view");
  });

  it("takes the longest matching prefix", () => {
    expect(routePermission("/enrollments")).toBe("enrollments.view");
    expect(routePermission("/enrollments/discounts/new")).toBe("enrollmentSetup.edit");
    expect(routePermission("/classes/detail")).toBe("enrollments.view");
    expect(routePermission("/classes/4/edit")).toBe("academicSetup.edit");
    expect(routePermission("/grades/locks")).toBe("grades.manage");
    expect(routePermission("/releases/reasons/new")).toBe("releases.edit");
    expect(routePermission("/releases/batch")).toBe("releases.edit");
  });

  it("doesn't match a prefix inside a word, and denies paths no rule covers", () => {
    expect(routePermission("/studentsx")).toBeUndefined();
    expect(routePermission("/billing")).toBeUndefined();
  });
});

describe("canOpen", () => {
  it("lets admins open everything", () => {
    expect(canOpen("/groups", new Set(), true)).toBe(true);
    expect(canOpen("/billing", new Set(), true)).toBe(true);
  });

  it("lets the enrollment desk register payments without opening the book", () => {
    const desk = new Set(["enrollments.view", "enrollments.edit", "payments.edit"]);
    expect(canOpen("/accounts/payments/new", desk)).toBe(true);
    expect(canOpen("/accounts/payments/batch", desk)).toBe(true);
    for (const path of ["/accounts/payments", "/accounts/receivable", "/accounts/payable", "/accounts/installments"]) expect(canOpen(path, desk)).toBe(false);
    expect(canOpen("/accounts/payments/new", new Set(["finance.view", "finance.edit"]))).toBe(false);
  });

  it("needs the exact permission, and denies uncovered paths", () => {
    const viewer = new Set(["students.view"]);
    expect(canOpen("/students", viewer)).toBe(true);
    expect(canOpen("/students/new", viewer)).toBe(false);
    expect(canOpen("/accounts/payable", viewer)).toBe(false);
    expect(canOpen("/billing", viewer)).toBe(false);
  });

  it("keeps groups for admins, whatever a group grants", () => {
    const everything = new Set<string>([...PERMISSIONS.map(([code]) => code), "groups.manage", "admin"]);
    for (const path of ["/groups", "/groups/new", "/groups/3/edit"]) {
      expect(canOpen(path, everything)).toBe(false);
      expect(canOpen(path, new Set(), true)).toBe(true);
    }
    expect(isPermission("groups.manage")).toBe(false);
  });

  it("knows its own codes", () => {
    expect(isPermission("students.view")).toBe(true);
    expect(isPermission("students.delete")).toBe(false);
  });
});

/** Every file named `name` under `dir`. */
function find(dir: string, name: string): string[] {
  return readdirSync(dir).flatMap((entry) => {
    const path = join(dir, entry);
    return statSync(path).isDirectory() ? find(path, name) : entry === name ? [path] : [];
  });
}

/** A page file's URL: route groups dropped, dynamic segments filled in. */
const pageUrl = (file: string, root: string) =>
  "/" +
  file
    .slice(root.length + 1, -"page.tsx".length)
    .split("/")
    .filter((s) => s && !s.startsWith("("))
    .map((s) => (s.startsWith("[") ? "1" : s))
    .join("/");

describe("coverage", () => {
  it("gives every page a rule, so a new screen isn't silently admin-only", () => {
    const pages = ["src/app/(app)", "src/app/(print)"].flatMap((root) => find(root, "page.tsx").map((f) => pageUrl(f, root).replace(/\/$/, "") || "/"));
    expect(pages.length).toBeGreaterThan(50);
    expect(pages.filter((url) => routePermission(url) === undefined)).toEqual([]);
  });

  it("gives every menu item a rule", () => {
    const hrefs = NAV.flatMap(function items(g): string[] {
      return [...g.items.map((i) => i.href), ...(g.groups ?? []).flatMap(items)];
    });
    expect(hrefs.filter((href) => routePermission(href) === undefined)).toEqual([]);
  });
});
