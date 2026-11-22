import { describe, expect, it, vi } from "vitest";

vi.mock("@/db", () => ({ db: {} }));
vi.mock("./auth", () => ({ auth: {} }));

const { loginPlan } = await import("./employee-login");

const input = (over: Partial<{ access: boolean; username: string; password: string }> = {}) => ({
  access: true,
  username: "maria.silva",
  password: "segredo123",
  ...over,
});

describe("loginPlan", () => {
  it("creates a login when access is ticked and there is none", () => {
    expect(loginPlan(input(), false)).toEqual({ plan: "create" });
  });
  it("updates an existing login, with or without a new password", () => {
    expect(loginPlan(input(), true)).toEqual({ plan: "update" });
    expect(loginPlan(input({ password: "" }), true)).toEqual({ plan: "update" });
  });
  it("deletes the login when access is unticked, and does nothing without one", () => {
    expect(loginPlan(input({ access: false }), true)).toEqual({ plan: "delete" });
    expect(loginPlan(input({ access: false, username: "", password: "" }), false)).toEqual({ plan: "none" });
  });
  it("requires a username and, for a new login, a password", () => {
    const { plan, errors } = loginPlan(input({ username: "", password: "" }), false);
    expect(plan).toBe("none");
    expect(Object.keys(errors!)).toEqual(["username", "password"]);
  });
  it("rejects short passwords and invalid usernames", () => {
    expect(loginPlan(input({ password: "curta" }), true).errors?.password).toBeDefined();
    expect(loginPlan(input({ username: "ab" }), false).errors?.username).toBeDefined();
    expect(loginPlan(input({ username: "joão" }), false).errors?.username).toBeDefined();
  });
  it("keeps an admin from removing their own access", () => {
    expect(loginPlan(input({ access: false }), true, true).errors?.access).toBeDefined();
    expect(loginPlan(input(), true, true)).toEqual({ plan: "update" });
  });
});
