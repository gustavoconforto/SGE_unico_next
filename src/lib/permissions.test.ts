import { describe, expect, it } from "vitest";
import { roles, statement } from "./permissions";

describe("roles", () => {
  it("gives admin every action of every resource", () => {
    expect(roles.admin.authorize(statement).success).toBe(true);
  });

  it("gives the base user role nothing", () => {
    expect(roles.user.authorize({ students: ["view"] }).success).toBe(false);
  });

  it("keeps teachers out of money and staff-only grades", () => {
    expect(roles.professor.authorize({ grades: ["view", "edit"] }).success).toBe(true);
    expect(roles.professor.authorize({ grades: ["manage"] }).success).toBe(false);
    expect(roles.professor.authorize({ finance: ["view"] }).success).toBe(false);
    expect(roles.professor.authorize({ payments: ["edit"] }).success).toBe(false);
  });

  it("lets only coordination lock grades, not the secretaria", () => {
    expect(roles.coordenacao.authorize({ grades: ["manage"] }).success).toBe(true);
    expect(roles.secretaria.authorize({ grades: ["edit"] }).success).toBe(false);
    expect(roles.secretaria.authorize({ payments: ["edit"] }).success).toBe(true);
  });

  it("keeps payables and suppliers to the financeiro, not the secretaria", () => {
    expect(roles.financeiro.authorize({ payables: ["view", "edit"], finance: ["edit"] }).success).toBe(true);
    expect(roles.secretaria.authorize({ finance: ["edit"] }).success).toBe(true);
    expect(roles.secretaria.authorize({ payables: ["view"] }).success).toBe(false);
  });

  it("lets the secretaria edit the timetable but not the class diary", () => {
    expect(roles.secretaria.authorize({ timetable: ["view", "edit"] }).success).toBe(true);
    expect(roles.secretaria.authorize({ lessons: ["edit"] }).success).toBe(false);
    expect(roles.coordenacao.authorize({ timetable: ["edit"], lessons: ["edit"] }).success).toBe(true);
  });

  it("never lets a department role manage users or roles", () => {
    for (const role of [roles.secretaria, roles.financeiro, roles.coordenacao, roles.professor])
      expect(role.authorize({ user: ["set-role"] }).success).toBe(false);
  });
});
