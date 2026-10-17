import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { randomUUID } from "node:crypto";
import { auth } from "./auth";
import { prisma } from "../database/client";
import { IDLE_TIMEOUT_MS } from "@/lib/security/idle-session";

const email = `idle-session-${randomUUID()}@test.local`;
const password = "Local-test-password-2026!";
const origin = "http://localhost:3000";
let userId: string;
let cookie: string;
let sessionId: string;

async function request(path: string, body?: unknown, requestOrigin = origin) {
  return auth.handler(new Request(`${origin}/api/auth${path}`, {
    method: body === undefined ? "GET" : "POST",
    headers: { Cookie: cookie ?? "", Origin: requestOrigin, ...(body === undefined ? {} : { "Content-Type": "application/json" }) },
    ...(body === undefined ? {} : { body: JSON.stringify(body) }),
  }));
}

beforeAll(async () => {
  const user = await prisma.user.create({ data: { email, name: "Idle test", emailVerified: true } });
  userId = user.id;
  await prisma.account.create({ data: { id: randomUUID(), accountId: userId, userId, providerId: "credential", password: await (await auth.$context).password.hash(password) } });
});
beforeEach(async () => {
  await prisma.user.update({ where: { id: userId }, data: { suspendedAt: null } });
  await prisma.session.deleteMany({ where: { userId } });
  cookie = "";
  const response = await request("/sign-in/email", { email, password, rememberMe: true });
  expect(response.status).toBe(200);
  cookie = response.headers.getSetCookie().map((value) => value.split(";")[0]).join("; ");
  sessionId = (await prisma.session.findFirstOrThrow({ where: { userId } })).id;
});
afterAll(async () => {
  if (userId) await prisma.user.delete({ where: { id: userId } });
  await prisma.$disconnect();
});

describe("server-enforced inactivity through real Better Auth endpoints", () => {
  it("limits a remembered session to five minutes and does not extend it on reads", async () => {
    const before = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(before.expiresAt.getTime() - before.createdAt.getTime()).toBeLessThanOrEqual(IDLE_TIMEOUT_MS + 1000);
    expect((await request("/get-session")).status).toBe(200);
    expect((await request("/get-session")).status).toBe(200);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).expiresAt).toEqual(before.expiresAt);
  });
  it("extends only a live session and returns a renewed signed cookie", async () => {
    await prisma.session.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() + 30_000) } });
    const before = Date.now();
    const response = await request("/session/activity", { idleForMs: 2000 });
    expect(response.status).toBe(200);
    expect(response.headers.getSetCookie().length).toBeGreaterThan(0);
    const active = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect(active.expiresAt.getTime()).toBeGreaterThanOrEqual(before + 298_000);
    expect(active.expiresAt.getTime()).toBeLessThanOrEqual(Date.now() + 298_000);
  });
  it("does not shorten a more recent activity deadline with a delayed tab heartbeat", async () => {
    const before = await prisma.session.findUniqueOrThrow({ where: { id: sessionId } });
    expect((await request("/session/activity", { idleForMs: 60_000 })).status).toBe(200);
    expect((await prisma.session.findUniqueOrThrow({ where: { id: sessionId } })).expiresAt).toEqual(before.expiresAt);
  });
  it("cannot revive an expired session even with an authenticated old cookie", async () => {
    await prisma.session.update({ where: { id: sessionId }, data: { expiresAt: new Date(Date.now() - 1000) } });
    expect((await request("/session/activity", { idleForMs: 0 })).status).toBe(401);
    const remaining = await prisma.session.findUnique({ where: { id: sessionId } });
    expect(!remaining || remaining.expiresAt.getTime() <= Date.now()).toBe(true);
    expect(await (await request("/get-session")).json()).toBeNull();
  });
  it("rejects activity from a suspended account", async () => {
    await prisma.user.update({ where: { id: userId }, data: { suspendedAt: new Date() } });
    expect((await request("/session/activity", { idleForMs: 0 })).status).toBe(401);
  });
  it("does not let activity bypass the absolute support-session duration", async () => {
    await prisma.session.update({ where: { id: sessionId }, data: { impersonatedBy: "support-admin-test", createdAt: new Date(Date.now() - 16 * 60_000) } });
    expect((await request("/session/activity", { idleForMs: 0 })).status).toBe(401);
    expect(await prisma.session.findUnique({ where: { id: sessionId } })).toBeNull();
  });
  it("rejects cross-origin activity and malformed idle durations", async () => {
    expect((await request("/session/activity", { idleForMs: 0 }, "https://untrusted.example")).status).toBe(403);
    expect((await request("/session/activity", { idleForMs: -1 })).status).toBe(400);
    expect((await request("/session/activity", { idleForMs: 300_000 })).status).toBe(400);
  });
});
