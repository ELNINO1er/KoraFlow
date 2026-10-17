import { describe, expect, it } from "vitest";
import { activityExpiry, IDLE_TIMEOUT_MS, sessionActivityTime } from "./idle-session";

describe("five-minute idle policy", () => {
  it("sets an exact five-minute deadline after genuine input", () => {
    const now = Date.parse("2026-10-17T10:00:00Z");
    expect(activityExpiry(now, 0).getTime()).toBe(now + 300_000);
    expect(IDLE_TIMEOUT_MS).toBe(300_000);
  });
  it("subtracts dispatch delay rather than treating the heartbeat as fresh input", () => {
    const now = Date.now();
    expect(activityExpiry(now, 15_000).getTime()).toBe(now + 285_000);
  });
  it("does not reset inactivity when a page is reloaded", () => {
    const now = Date.now();
    const expiry = new Date(now + 60_000);
    expect(sessionActivityTime(expiry, 0, now)).toBe(now - 240_000);
    expect(sessionActivityTime(expiry, now - 10_000, now)).toBe(now - 10_000);
    expect(sessionActivityTime(expiry, now + 500_000, now)).toBe(now);
  });
});
