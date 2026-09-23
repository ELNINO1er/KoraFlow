import { describe, it, expect } from "vitest";
import { rateLimit } from "./rate-limit";

describe("rateLimit", () => {
  it("autorise jusqu'à la limite puis bloque dans la fenêtre", () => {
    const key = `test-${Math.random()}`;
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    expect(rateLimit(key, 2, 60_000).ok).toBe(true);
    const blocked = rateLimit(key, 2, 60_000);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfterMs).toBeGreaterThan(0);
  });

  it("des clés différentes sont indépendantes", () => {
    expect(rateLimit(`a-${Math.random()}`, 1, 60_000).ok).toBe(true);
    expect(rateLimit(`b-${Math.random()}`, 1, 60_000).ok).toBe(true);
  });
});
