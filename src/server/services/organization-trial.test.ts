import { createHmac } from "node:crypto";
import { deleteOrganizations } from "@/server/database/test-cleanup";
import { describe, it, expect, beforeAll, afterAll, beforeEach, vi } from "vitest";
import { prisma } from "../database/client";
import type { PlatformAdmin } from "../auth/platform";

/**
 * Période d'essai gratuite de 15 jours (intégration, base MariaDB isolée) :
 * date de fin posée à la création, exemption du compte principal, blocage de
 * l'espace après expiration, prolongation depuis la console /admin.
 */
const mocks = vi.hoisted(() => ({
  getSession: vi.fn(),
  cookie: undefined as string | undefined,
}));
vi.mock("../auth/auth", () => ({ auth: { api: { getSession: mocks.getSession } } }));
vi.mock("next/headers", () => ({
  headers: vi.fn(async () => new Headers()),
  cookies: vi.fn(async () => ({
    get: (name: string) => (mocks.cookie ? { name, value: mocks.cookie } : undefined),
  })),
}));
vi.mock("next/navigation", () => ({
  redirect: vi.fn((url: string) => {
    throw new Error(`REDIRECT:${url}`);
  }),
}));

vi.mock("./notification-service", () => ({ notifyOrg: vi.fn().mockResolvedValue(undefined) }));

import { createOrganization } from "./organization-service";
import { createContact } from "./contact-service";
import { createQuote } from "./quote-service";
import { resolveSession, requireAuthContext } from "../auth/context";
import { setOrganizationTrial, PlatformAdminError } from "./platform-admin";

import { POST as jekoWebhook } from "@/app/api/webhooks/jeko/route";
import { createSubscriptionCheckout } from "./subscription-checkout";

const SUFFIX = "org-trial-test";
const DAY = 24 * 60 * 60 * 1000;
const EXEMPT_EMAIL = `principal-${SUFFIX}@test.local`;
const userIds: string[] = [];

async function makeUser(label: string, data: { isPlatformAdmin?: boolean; email?: string } = {}) {
  const user = await prisma.user.create({
    data: {
      email: data.email ?? `${label}-${SUFFIX}@test.local`,
      name: label,
      emailVerified: true,
      isPlatformAdmin: data.isPlatformAdmin ?? false,
    },
  });
  userIds.push(user.id);
  return user;
}

function signedInAs(user: { id: string; email: string; name: string | null }, activeOrgId?: string) {
  mocks.getSession.mockResolvedValue({ user: { ...user, image: null }, session: {} });
  mocks.cookie = activeOrgId;
}

const previousExempt = process.env.TRIAL_EXEMPT_EMAILS;

beforeAll(() => {
  process.env.TRIAL_EXEMPT_EMAILS = `autre@example.test, ${EXEMPT_EMAIL.toUpperCase()}`;
});

beforeEach(() => {
  mocks.getSession.mockReset();
  mocks.cookie = undefined;
});

afterAll(async () => {
  process.env.TRIAL_EXEMPT_EMAILS = previousExempt;
  await prisma.auditLog.deleteMany({ where: { actorUserId: { in: userIds } } });
  await deleteOrganizations({ memberships: { some: { userId: { in: userIds } } } });
  await deleteOrganizations({ slug: { startsWith: `legacy-${SUFFIX}` } });
  await prisma.user.deleteMany({ where: { id: { in: userIds } } });
});

describe("création d'organisation", () => {
  it("donne 15 jours d'essai à une nouvelle inscription, visibles dans le contexte", async () => {
    const user = await makeUser("nouveau");
    const before = Date.now();
    const org = await createOrganization({ userId: user.id, name: `Nouvelle ${SUFFIX}` });
    expect(org.trialEndsAt).not.toBeNull();
    const delta = org.trialEndsAt!.getTime() - before;
    expect(delta).toBeGreaterThanOrEqual(15 * DAY - 1000);
    expect(delta).toBeLessThanOrEqual(15 * DAY + 60_000);

    signedInAs(user);
    const session = await resolveSession();
    expect(session.status).toBe("ok");
    if (session.status !== "ok") return;
    expect(session.context.trial).toMatchObject({ kind: "active", daysLeft: 15 });

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { organizationId: org.id, action: "organization.created" },
    });
    expect(audit.metadata).toMatchObject({ trialEndsAt: org.trialEndsAt!.toISOString() });
  });

  it("n'impose aucun essai au compte principal (e-mail exempté) ni à un admin plateforme", async () => {
    const principal = await makeUser("principal", { email: EXEMPT_EMAIL });
    const admin = await makeUser("admin", { isPlatformAdmin: true });
    const a = await createOrganization({ userId: principal.id, name: `Principal ${SUFFIX}` });
    const b = await createOrganization({ userId: admin.id, name: `Admin ${SUFFIX}` });
    expect(a.trialEndsAt).toBeNull();
    expect(b.trialEndsAt).toBeNull();
  });

  it("ne relance pas un essai échu en créant une autre organisation", async () => {
    const user = await makeUser("recidive");
    const first = await createOrganization({ userId: user.id, name: `Première ${SUFFIX}` });
    const expiredAt = new Date(Date.now() - DAY);
    await prisma.organization.update({ where: { id: first.id }, data: { trialEndsAt: expiredAt } });
    const second = await createOrganization({ userId: user.id, name: `Seconde ${SUFFIX}` });
    expect(second.trialEndsAt?.getTime()).toBe(expiredAt.getTime());
  });
});

describe("accès à l'espace après l'essai", () => {
  it("bloque l'organisation à l'essai échu, sans rien supprimer", async () => {
    const user = await makeUser("expire");
    const org = await createOrganization({ userId: user.id, name: `Expirée ${SUFFIX}` });
    const endedAt = new Date(Date.now() - 60_000);
    await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: endedAt } });

    signedInAs(user);
    const session = await resolveSession();
    expect(session).toMatchObject({
      status: "trial-expired",
      user: { id: user.id },
      organization: { id: org.id, name: org.name, trialEndsAt: endedAt },
    });
    await expect(requireAuthContext()).rejects.toThrow("REDIRECT:/essai-termine");
    // Données intactes.
    expect(await prisma.organization.count({ where: { id: org.id, deletedAt: null } })).toBe(1);
    expect(await prisma.membership.count({ where: { organizationId: org.id } })).toBe(1);
  });

  it("laisse passer les organisations existantes sans date d'essai (déploiement sans blocage)", async () => {
    const user = await makeUser("historique");
    const legacy = await prisma.organization.create({
      data: { name: "Historique", slug: `legacy-${SUFFIX}` },
    });
    expect(legacy.trialEndsAt).toBeNull();
    await prisma.membership.create({ data: { userId: user.id, organizationId: legacy.id, role: "OWNER" } });

    signedInAs(user, legacy.id);
    const session = await resolveSession();
    expect(session.status).toBe("ok");
    if (session.status === "ok") expect(session.context.trial).toEqual({ kind: "none" });
  });

  it("ne limite jamais le compte principal, même membre d'une organisation à l'essai échu", async () => {
    const owner = await makeUser("proprio");
    const org = await createOrganization({ userId: owner.id, name: `Partagée ${SUFFIX}` });
    await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: new Date(Date.now() - DAY) } });
    const principal = await prisma.user.findUniqueOrThrow({ where: { email: EXEMPT_EMAIL } });
    await prisma.membership.create({ data: { userId: principal.id, organizationId: org.id, role: "ADMIN" } });

    signedInAs(principal, org.id);
    expect((await resolveSession()).status).toBe("ok");
    signedInAs(owner, org.id);
    expect((await resolveSession()).status).toBe("trial-expired");
  });

  it("ne bloque pas une organisation dont le propriétaire est exempté (créée avant l'exemption)", async () => {
    const boss = await makeUser("boss");
    const member = await makeUser("collegue");
    const org = await createOrganization({ userId: boss.id, name: `Boss ${SUFFIX}` });
    await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: new Date(Date.now() - DAY) } });
    await prisma.membership.create({ data: { userId: member.id, organizationId: org.id, role: "COLLABORATOR" } });
    await prisma.user.update({ where: { id: boss.id }, data: { isPlatformAdmin: true } });

    signedInAs(member, org.id);
    const session = await resolveSession();
    expect(session.status).toBe("ok");
    if (session.status === "ok") expect(session.context.trial).toEqual({ kind: "none" });
  });

  it("une impersonation n'hérite pas de l'exemption admin de la cible", async () => {
    const admin = await makeUser("admin-cible", { isPlatformAdmin: true });
    const owner = await makeUser("proprio-imp");
    const org = await createOrganization({ userId: owner.id, name: `Imp ${SUFFIX}` });
    await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: new Date(Date.now() - DAY) } });
    await prisma.membership.create({ data: { userId: admin.id, organizationId: org.id, role: "ADMIN" } });

    mocks.getSession.mockResolvedValue({
      user: { ...admin, image: null },
      session: { impersonatedBy: "un-autre-admin" },
    });
    mocks.cookie = org.id;
    expect((await resolveSession()).status).toBe("trial-expired");
  });
});

describe("console /admin : prolongation de l'essai", () => {
  let platformAdmin: PlatformAdmin;
  let orgId = "";

  beforeAll(async () => {
    const admin = await makeUser("console", { isPlatformAdmin: true });
    platformAdmin = { id: admin.id, email: admin.email, name: admin.name };
    const owner = await makeUser("client-console");
    orgId = (await createOrganization({ userId: owner.id, name: `Console ${SUFFIX}` })).id;
  });

  it("prolonge depuis la fin en cours, ou depuis aujourd'hui si l'essai est échu", async () => {
    const now = new Date();
    const end = new Date(now.getTime() + 2 * DAY);
    await prisma.organization.update({ where: { id: orgId }, data: { trialEndsAt: end } });
    const extended = await setOrganizationTrial(platformAdmin, orgId, { mode: "extend", days: 7 }, now);
    expect(extended?.getTime()).toBe(end.getTime() + 7 * DAY);

    await prisma.organization.update({ where: { id: orgId }, data: { trialEndsAt: new Date(now.getTime() - 5 * DAY) } });
    const revived = await setOrganizationTrial(platformAdmin, orgId, { mode: "extend", days: 15 }, now);
    expect(revived?.getTime()).toBe(now.getTime() + 15 * DAY);

    const audit = await prisma.auditLog.findFirstOrThrow({
      where: { organizationId: orgId, action: "platform.org_trial_updated" },
      orderBy: { createdAt: "desc" },
    });
    expect(audit.actorUserId).toBe(platformAdmin.id);
    expect(audit.metadata).toMatchObject({ mode: "extend", after: revived!.toISOString() });
  });

  it("renouveler (prolonger ou lever la limite) rend l'accès avec toutes les données intactes", async () => {
    const owner = await makeUser("renouvellement");
    const org = await createOrganization({ userId: owner.id, name: `Renouvellement ${SUFFIX}` });
    signedInAs(owner, org.id);
    const active = await resolveSession();
    if (active.status !== "ok") throw new Error(`statut inattendu : ${active.status}`);
    const ctx = active.context;
    const contact = await createContact(ctx, {
      firstName: "Naya",
      lastName: "Fidèle",
      email: `naya-${SUFFIX}@example.test`,
      phone: undefined,
      companyName: "Maison Naya",
      source: undefined,
      notes: undefined,
      ownerId: undefined,
    });
    const quote = await createQuote(ctx, {
      contactId: contact.id,
      items: [{ description: "Site vitrine", unitPriceMinor: 1_000_000, quantity: 1, taxRate: 0 }],
    });
    const snapshot = async () => ({
      contacts: await prisma.contact.count({ where: { organizationId: org.id, deletedAt: null } }),
      quotes: await prisma.quote.count({ where: { organizationId: org.id, deletedAt: null } }),
      members: await prisma.membership.count({ where: { organizationId: org.id } }),
    });
    const before = await snapshot();
    expect(before).toEqual({ contacts: 1, quotes: 1, members: 1 });

    // Essai échu : accès bloqué, rien n'est supprimé.
    await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: new Date(Date.now() - DAY) } });
    expect((await resolveSession()).status).toBe("trial-expired");
    expect(await snapshot()).toEqual(before);

    // Renouvellement par l'admin : même organisation, mêmes données, accès rétabli.
    await setOrganizationTrial(platformAdmin, org.id, { mode: "extend", days: 30 });
    const renewed = await resolveSession();
    expect(renewed.status).toBe("ok");
    if (renewed.status === "ok") expect(renewed.context.organizationId).toBe(org.id);
    expect(await snapshot()).toEqual(before);
    expect(await prisma.quote.findUniqueOrThrow({ where: { id: quote.id } })).toMatchObject({ contactId: contact.id });

    // Abonnement sans échéance : idem.
    await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: new Date(Date.now() - DAY) } });
    await setOrganizationTrial(platformAdmin, org.id, { mode: "unlimited" });
    const unlimited = await resolveSession();
    expect(unlimited.status).toBe("ok");
    if (unlimited.status === "ok") expect(unlimited.context.trial).toEqual({ kind: "none" });
    expect(await snapshot()).toEqual(before);
  });

  it("fixe une date de fin future, ou lève la limite", async () => {
    const now = new Date("2026-11-09T12:00:00.000Z");
    const until = await setOrganizationTrial(platformAdmin, orgId, { mode: "until", date: "2026-12-31" }, now);
    expect(until?.toISOString()).toBe("2026-12-31T23:59:59.000Z");
    expect(await setOrganizationTrial(platformAdmin, orgId, { mode: "unlimited" }, now)).toBeNull();
    const org = await prisma.organization.findUniqueOrThrow({ where: { id: orgId } });
    expect(org.trialEndsAt).toBeNull();
  });

  it("refuse les valeurs invalides et les non-admins", async () => {
    const now = new Date("2026-11-09T12:00:00.000Z");
    await expect(setOrganizationTrial(platformAdmin, orgId, { mode: "extend", days: 0 }, now)).rejects.toThrow(PlatformAdminError);
    await expect(setOrganizationTrial(platformAdmin, orgId, { mode: "extend", days: 1.5 }, now)).rejects.toThrow(PlatformAdminError);
    await expect(setOrganizationTrial(platformAdmin, orgId, { mode: "until", date: "2026-11-01" }, now)).rejects.toThrow(/futur/);
    await expect(setOrganizationTrial(platformAdmin, orgId, { mode: "until", date: "demain" }, now)).rejects.toThrow(PlatformAdminError);
    const lambda = await makeUser("lambda");
    await expect(
      setOrganizationTrial({ id: lambda.id, email: lambda.email, name: null }, orgId, { mode: "unlimited" }, now),
    ).rejects.toThrow(/administrateur/);
  });
});

it("encaisse 10 000 XOF après l’essai et réactive l’organisation une seule fois", async () => {
  const owner = await makeUser("jeko");
  const org = await createOrganization({ userId: owner.id, name: `Jeko ${SUFFIX}` });
  signedInAs(owner, org.id);
  const expired = new Date(Date.now() - DAY);
  await prisma.organization.update({ where: { id: org.id }, data: { trialEndsAt: expired } });
  expect((await resolveSession()).status).toBe("trial-expired");

  vi.stubEnv("JEKO_STORE_ID", "alymero-test-store");
  vi.stubEnv("JEKO_API_KEY_ID", "fake-key-id");
  vi.stubEnv("JEKO_API_KEY", "fake-key");
  vi.stubEnv("JEKO_WEBHOOK_SECRET", "fake-webhook-secret");
  vi.stubEnv("APP_URL", "https://alymero.example");
  const checkoutUrl = "https://pay.jeko.africa/pay_request/pr/test-request";
  const providerId = "test-request";
  let reference = "";
  vi.stubGlobal("fetch", vi.fn(async (_url: string, init: RequestInit) => {
    const body = JSON.parse(String(init.body));
    expect(body).toMatchObject({ storeId: "alymero-test-store", amountCents: 1_000_000, currency: "XOF" });
    reference = body.reference;
    return Response.json({ id: providerId, reference, storeId: body.storeId, redirectUrl: checkoutUrl });
  }));
  try {
    expect(await createSubscriptionCheckout(org.id, "wave")).toBe(checkoutUrl);
    const payload = {
      id: "test-jeko-transaction", status: "success", transactionType: "payment",
      storeId: "alymero-test-store", amount: { amount: 1_000_000, currency: "XOF" },
      transactionDetails: { id: providerId, reference },
    };
    const notify = (data: object, validSignature = true) => {
      const body = JSON.stringify(data);
      const signature = createHmac("sha256", "fake-webhook-secret").update(body).digest("hex");
      return jekoWebhook(new Request("https://alymero.example/api/webhooks/jeko", {
        method: "POST", body,
        headers: { "Jeko-Event": "TRANSACTION_COMPLETED", "Jeko-Signature": validSignature ? signature : "invalid" },
      }));
    };
    expect((await notify(payload, false)).status).toBe(401);
    await notify({ ...payload, amount: { amount: 100, currency: "XOF" } });
    await notify({ ...payload, storeId: "other-store" });
    expect((await resolveSession()).status).toBe("trial-expired");
    expect((await notify(payload)).status).toBe(204);
    const updated = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(updated.trialEndsAt).toEqual(expired);
    expect(updated.subscriptionEndsAt!.getTime()).toBeGreaterThan(Date.now() + 27 * DAY);
    expect(await resolveSession()).toMatchObject({ status: "ok", context: { organizationId: org.id } });
    expect((await notify(payload)).status).toBe(204);
    const replayed = await prisma.organization.findUniqueOrThrow({ where: { id: org.id } });
    expect(replayed.subscriptionEndsAt).toEqual(updated.subscriptionEndsAt);
    await prisma.organization.update({ where: { id: org.id }, data: { subscriptionEndsAt: expired } });
    expect((await resolveSession()).status).toBe("trial-expired");
  } finally {
    vi.unstubAllGlobals();
    vi.unstubAllEnvs();
  }
});
