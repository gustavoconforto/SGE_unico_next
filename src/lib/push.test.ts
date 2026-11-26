import { describe, expect, it, vi } from "vitest";

vi.mock("server-only", () => ({}));
vi.mock("@/db", () => ({ db: {} }));

const { isPushEndpoint } = await import("./push");

describe("isPushEndpoint", () => {
  it("accepts the browsers' push services over https", () => {
    expect(isPushEndpoint("https://fcm.googleapis.com/fcm/send/abc")).toBe(true);
    expect(isPushEndpoint("https://web.push.apple.com/QGx")).toBe(true);
    expect(isPushEndpoint("https://updates.push.services.mozilla.com/wpush/v2/x")).toBe(true);
    expect(isPushEndpoint("https://wns2-bl2p.notify.windows.com/w/?token=x")).toBe(true);
  });
  it("rejects any other host, plain http and junk (the server would POST there)", () => {
    expect(isPushEndpoint("http://fcm.googleapis.com/fcm/send/abc")).toBe(false);
    expect(isPushEndpoint("https://169.254.169.254/latest/meta-data")).toBe(false);
    expect(isPushEndpoint("https://localhost:3000/x")).toBe(false);
    expect(isPushEndpoint("https://evil.com/.googleapis.com")).toBe(false);
    expect(isPushEndpoint("https://googleapis.com.evil.com/x")).toBe(false);
    expect(isPushEndpoint("not a url")).toBe(false);
  });
});
