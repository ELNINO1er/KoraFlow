import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({ getSession: vi.fn(), findUnique: vi.fn() }));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/navigation", () => ({ redirect: (path: string) => { throw new Error(`redirect:${path}`); }, notFound: () => { throw new Error("not-found"); } }));
vi.mock("./auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("../database/client", () => ({ prisma: { user: { findUnique: mocks.findUnique } } }));
import { requirePlatformAdmin, resolvePlatformAdmin } from "./platform";

beforeEach(() => {
  vi.clearAllMocks();
  mocks.getSession.mockResolvedValue({ user: { id: "admin" }, session: {} });
  mocks.findUnique.mockResolvedValue({ id: "admin", email: "admin@test.local", name: "Admin", isPlatformAdmin: true, suspendedAt: null, twoFactorEnabled: true });
});

describe("platform access boundary", () => {
  it("rejects anonymous visitors", async () => {
    mocks.getSession.mockResolvedValue(null);
    await expect(requirePlatformAdmin()).rejects.toThrow("redirect:/login");
  });
  it("rejects suspended accounts even when they are admins", async () => {
    mocks.findUnique.mockResolvedValue({ isPlatformAdmin: true, suspendedAt: new Date() });
    await expect(requirePlatformAdmin()).rejects.toThrow("not-found");
  });
  it("does not grant platform permissions during impersonation", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "admin" }, session: { impersonatedBy: "other-admin" } });
    expect(await resolvePlatformAdmin()).toBeNull();
    expect(mocks.findUnique).not.toHaveBeenCalled();
  });
  it("requires MFA enrollment for the console and permits the setup page", async () => {
    mocks.findUnique.mockResolvedValue({ id: "admin", isPlatformAdmin: true, suspendedAt: null, twoFactorEnabled: false });
    await expect(requirePlatformAdmin()).rejects.toThrow("redirect:/admin/security");
    await expect(requirePlatformAdmin({ requireTwoFactor: false })).resolves.toMatchObject({ id: "admin" });
  });
  it("rechecks the database flag instead of trusting an auth-library role", async () => {
    mocks.getSession.mockResolvedValue({ user: { id: "ordinary", role: "admin" }, session: {} });
    mocks.findUnique.mockResolvedValue({ isPlatformAdmin: false });
    await expect(requirePlatformAdmin()).rejects.toThrow("not-found");
  });
});
