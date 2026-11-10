import { describe, expect, it } from "vitest";
import {
  TRIAL_DAYS,
  computeTrialEnd,
  extendTrialEnd,
  isTrialExemptAccount,
  parseExemptEmails,
  trialState,
} from "./trial";

const DAY = 24 * 60 * 60 * 1000;
const now = new Date("2026-11-09T10:00:00.000Z");

describe("période d'essai (logique pure)", () => {
  it("dure 15 jours à partir de la création", () => {
    expect(TRIAL_DAYS).toBe(15);
    expect(computeTrialEnd(now).getTime() - now.getTime()).toBe(15 * DAY);
  });

  it("compte les jours restants au jour supérieur", () => {
    expect(trialState(computeTrialEnd(now), { now })).toEqual({
      kind: "active",
      endsAt: computeTrialEnd(now),
      daysLeft: 15,
    });
    const soon = new Date(now.getTime() + 2 * 60 * 60 * 1000);
    expect(trialState(soon, { now })).toMatchObject({ kind: "active", daysLeft: 1 });
  });

  it("est échu à la date de fin, et sans limite si NULL ou exempté", () => {
    expect(trialState(now, { now })).toEqual({ kind: "expired", endsAt: now });
    expect(trialState(new Date(now.getTime() - DAY), { now }).kind).toBe("expired");
    expect(trialState(null, { now })).toEqual({ kind: "none" });
    expect(trialState(new Date(now.getTime() - DAY), { now, exempt: true })).toEqual({ kind: "none" });
  });

  it("exempte les admins plateforme et les e-mails de TRIAL_EXEMPT_EMAILS (casse ignorée)", () => {
    const env = { TRIAL_EXEMPT_EMAILS: " Boss@Example.test ; autre@example.test" };
    expect(parseExemptEmails(env.TRIAL_EXEMPT_EMAILS)).toEqual(new Set(["boss@example.test", "autre@example.test"]));
    expect(isTrialExemptAccount({ email: "boss@example.test" }, env)).toBe(true);
    expect(isTrialExemptAccount({ email: "client@example.test", isPlatformAdmin: true }, {})).toBe(true);
    expect(isTrialExemptAccount({ email: "client@example.test" }, env)).toBe(false);
    expect(isTrialExemptAccount({ email: "client@example.test" }, {})).toBe(false);
  });

  it("prolonge depuis la fin en cours, ou depuis aujourd'hui si l'essai est échu", () => {
    const running = new Date(now.getTime() + 3 * DAY);
    expect(extendTrialEnd(running, 7, now).getTime()).toBe(running.getTime() + 7 * DAY);
    expect(extendTrialEnd(new Date(now.getTime() - 5 * DAY), 7, now).getTime()).toBe(now.getTime() + 7 * DAY);
    expect(extendTrialEnd(null, 15, now).getTime()).toBe(now.getTime() + 15 * DAY);
  });
});
