import { beforeEach, describe, expect, it, vi } from "vitest";

const mocks = vi.hoisted(() => ({
  requireAdmin: vi.fn(), verifyPassword: vi.fn(), hash: vi.fn(), sendVerification: vi.fn(),
  setAdmin: vi.fn(), mutation: vi.fn(), findUser: vi.fn(), createUser: vi.fn(), createAccount: vi.fn(), createAudit: vi.fn(),
  verifyTotp: vi.fn(), revokeOtherSessions: vi.fn(), deleteSessions: vi.fn(),
}));
vi.mock("next/headers", () => ({ headers: async () => new Headers() }));
vi.mock("next/cache", () => ({ revalidatePath: vi.fn() }));
vi.mock("next/navigation", () => ({ redirect: vi.fn() }));
vi.mock("@/lib/security/rate-limit", () => ({ rateLimit: () => ({ ok: true }) }));
vi.mock("@/server/auth/platform", () => ({ requirePlatformAdmin: mocks.requireAdmin }));
vi.mock("@/server/auth/auth", () => ({ auth: {
  api: { verifyPassword: mocks.verifyPassword, sendVerificationEmail: mocks.sendVerification, verifyTOTP: mocks.verifyTotp, revokeOtherSessions: mocks.revokeOtherSessions },
  $context: Promise.resolve({ password: { hash: mocks.hash } }),
} }));
vi.mock("@/server/database/client", () => ({ prisma: { user: { findUnique: mocks.findUser } } }));
vi.mock("@/server/services/platform-admin", () => ({
  PlatformAdminError: class PlatformAdminError extends Error {},
  setUserPlatformAdmin: mocks.setAdmin,
  adminMutation: mocks.mutation,
}));
import { createPlatformAdminAction, promoteAdminByEmailAction, setPlatformAdminAction, verifyAdminTwoFactorAction } from "./actions";

const confirmation = { password: "operator-password", reason: "Renfort du support client" };
const input = { email: "new-admin@test.local", name: "New Admin", initialPassword: "new-account-password" };

beforeEach(() => {
  vi.resetAllMocks();
  mocks.requireAdmin.mockResolvedValue({ id: "operator", email: "operator@test.local", twoFactorEnabled: true });
  mocks.verifyPassword.mockResolvedValue({ status: true });
  mocks.hash.mockResolvedValue("hashed-password");
  mocks.createUser.mockResolvedValue({ id: "new-admin" });
  mocks.mutation.mockImplementation(async (_admin, run) => run({
    user: { findUnique: mocks.findUser, create: mocks.createUser },
    account: { create: mocks.createAccount }, auditLog: { create: mocks.createAudit },
    session: { deleteMany: mocks.deleteSessions },
  }));
});

describe("platform-admin action protections", () => {
  it("does not create accounts for an unauthorized actor", async () => {
    mocks.requireAdmin.mockRejectedValue(new Error("not-found"));
    await expect(createPlatformAdminAction(input, confirmation)).rejects.toThrow("not-found");
    expect(mocks.hash).not.toHaveBeenCalled();
    expect(mocks.mutation).not.toHaveBeenCalled();
  });
  it("requires reauthentication to grant or revoke privileges", async () => {
    expect(await setPlatformAdminAction("target", true)).toMatchObject({ ok: false });
    expect(mocks.setAdmin).not.toHaveBeenCalled();
    mocks.verifyPassword.mockRejectedValue(new Error("bad-password"));
    expect(await setPlatformAdminAction("target", false, confirmation)).toMatchObject({ ok: false });
    expect(mocks.setAdmin).not.toHaveBeenCalled();
  });
  it("promotes an existing account only after checking the operator’s password", async () => {
    mocks.findUser.mockResolvedValue({ id: "target", isPlatformAdmin: false });
    expect(await promoteAdminByEmailAction("TARGET@test.local", confirmation)).toMatchObject({ ok: true });
    expect(mocks.verifyPassword).toHaveBeenCalledOnce();
    expect(mocks.setAdmin).toHaveBeenCalledWith(expect.objectContaining({ id: "operator" }), "target", true, confirmation.reason);
  });
  it("creates synchronized admin flags, hashed credentials and audit in one transaction", async () => {
    expect(await createPlatformAdminAction(input, confirmation)).toMatchObject({ ok: true });
    expect(mocks.mutation).toHaveBeenCalledOnce();
    expect(mocks.createUser).toHaveBeenCalledWith({ data: expect.objectContaining({ isPlatformAdmin: true, role: "admin", emailVerified: false }) });
    expect(mocks.createAccount).toHaveBeenCalledWith({ data: expect.objectContaining({ userId: "new-admin", providerId: "credential", password: "hashed-password" }) });
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ actorUserId: "operator", action: "platform.admin_created", metadata: expect.objectContaining({ reason: confirmation.reason }) }) });
    expect(JSON.stringify(mocks.createAudit.mock.calls)).not.toContain(input.initialPassword);
    expect(JSON.stringify(mocks.createAudit.mock.calls)).not.toContain(confirmation.password);
    expect(mocks.sendVerification).toHaveBeenCalledOnce();
  });
  it("reports a failed verification email without inviting duplicate account creation", async () => {
    mocks.sendVerification.mockRejectedValue(new Error("SMTP down"));
    expect(await createPlatformAdminAction(input, confirmation)).toMatchObject({ ok: true, message: expect.stringContaining("n’a pas pu être envoyé") });
    expect(mocks.createUser).toHaveBeenCalledOnce();
  });
  it("refuses to overwrite an existing account", async () => {
    mocks.findUser.mockResolvedValue({ id: "existing" });
    expect(await createPlatformAdminAction(input, confirmation)).toMatchObject({ ok: false, error: expect.stringContaining("existe déjà") });
    expect(mocks.createUser).not.toHaveBeenCalled();
    expect(mocks.createAccount).not.toHaveBeenCalled();
  });

  it("closes pre-enrollment sessions and records successful MFA enrollment", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "operator", twoFactorEnabled: false });
    expect(await verifyAdminTwoFactorAction("123456")).toEqual({ ok: true });
    expect(mocks.revokeOtherSessions).toHaveBeenCalledOnce();
    expect(mocks.verifyTotp).toHaveBeenCalledWith(expect.objectContaining({ body: { code: "123456" } }));
    expect(mocks.revokeOtherSessions.mock.invocationCallOrder[0]).toBeLessThan(mocks.verifyTotp.mock.invocationCallOrder[0]!);
    expect(mocks.deleteSessions).toHaveBeenCalledWith({ where: { userId: "operator" } });
    expect(mocks.createAudit).toHaveBeenCalledWith({ data: expect.objectContaining({ action: "platform.two_factor_enabled", actorUserId: "operator" }) });
  });

  it("does not record successful MFA enrollment when the code is invalid", async () => {
    mocks.requireAdmin.mockResolvedValue({ id: "operator", twoFactorEnabled: false });
    mocks.verifyTotp.mockRejectedValue(new Error("invalid-code"));
    expect(await verifyAdminTwoFactorAction("123456")).toMatchObject({ ok: false });
    expect(mocks.createAudit).not.toHaveBeenCalled();
    expect(mocks.deleteSessions).not.toHaveBeenCalled();
  });
});
