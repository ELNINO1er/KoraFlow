import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ get: vi.fn(), post: vi.fn() }));
vi.mock("@/server/auth/auth", () => ({ auth: {} }));
vi.mock("better-auth/next-js", () => ({ toNextJsHandler: () => ({ GET: mocks.get, POST: mocks.post }) }));
import { GET, POST } from "./route";

beforeEach(() => { vi.clearAllMocks(); });

describe("auth admin HTTP namespace", () => {
  it.each(["set-role", "create-user", "remove-user", "impersonate-user", "set-user-password", "future-endpoint"])("blocks direct admin/%s calls", async (endpoint) => {
    const response = await POST(new Request(`https://example.test/api/auth/admin/${endpoint}`, { method: "POST" }));
    expect(response.status).toBe(404);
    expect(mocks.post).not.toHaveBeenCalled();
  });
  it("blocks percent-encoded admin paths as well", async () => {
    expect((await GET(new Request("https://example.test/api/auth/%61dmin/list-users"))).status).toBe(404);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("normalizes duplicate slashes and rejects malformed encodings", async () => {
    expect((await GET(new Request("https://example.test/api/auth//admin//list-users"))).status).toBe(404);
    expect((await GET(new Request("https://example.test/api/auth/%ZZ"))).status).toBe(400);
    expect(mocks.get).not.toHaveBeenCalled();
  });
  it("continues to handle sign-in and MFA routes normally", async () => {
    mocks.post.mockResolvedValue(new Response("ok"));
    const response = await POST(new Request("https://example.test/api/auth/two-factor/verify-totp", { method: "POST" }));
    expect(response.status).toBe(200);
    expect(mocks.post).toHaveBeenCalledOnce();
  });
});
