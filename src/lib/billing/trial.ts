/**
 * Période d'essai gratuite des organisations (logique pure, sans accès base).
 *
 * Règles :
 * - Une organisation créée reçoit `trialEndsAt = création + TRIAL_DAYS jours`.
 * - `trialEndsAt = null` signifie « aucune limite » : organisations antérieures
 *   à l'essai, organisations créées par un compte exempté, ou essai levé par un
 *   admin plateforme depuis la console /admin.
 * - Un compte exempté (admin plateforme, ou e-mail listé dans la variable
 *   d'environnement TRIAL_EXEMPT_EMAILS) n'est jamais limité, quelle que soit
 *   l'organisation.
 * - L'expiration ne supprime aucune donnée : elle bloque l'espace de travail.
 *   Les pages publiques (devis, factures, contrats, portail) restent servies.
 */

export const TRIAL_DAYS = 15;
const DAY_MS = 24 * 60 * 60 * 1000;

/** Date de fin d'essai pour une organisation créée à `from`. */
export function computeTrialEnd(from: Date = new Date(), days: number = TRIAL_DAYS): Date {
  return new Date(from.getTime() + days * DAY_MS);
}

export type TrialState =
  | { kind: "none" }
  | { kind: "active"; endsAt: Date; daysLeft: number }
  | { kind: "expired"; endsAt: Date };

/**
 * État d'essai d'une organisation à l'instant `now`.
 * `daysLeft` est arrondi au jour supérieur (il reste « 1 jour » jusqu'à la fin).
 */
export function trialState(
  trialEndsAt: Date | null | undefined,
  options: { exempt?: boolean; now?: Date } = {},
): TrialState {
  if (!trialEndsAt || options.exempt) return { kind: "none" };
  const now = options.now ?? new Date();
  const remaining = trialEndsAt.getTime() - now.getTime();
  if (remaining <= 0) return { kind: "expired", endsAt: trialEndsAt };
  return { kind: "active", endsAt: trialEndsAt, daysLeft: Math.ceil(remaining / DAY_MS) };
}

/** Liste normalisée des e-mails exemptés (CSV, insensible à la casse). */
export function parseExemptEmails(raw: string | undefined | null): Set<string> {
  return new Set(
    (raw ?? "")
      .split(/[,;\s]+/)
      .map((e) => e.trim().toLowerCase())
      .filter(Boolean),
  );
}

/**
 * Un compte est exempté de l'essai s'il est admin plateforme ou si son e-mail
 * figure dans TRIAL_EXEMPT_EMAILS.
 */
export function isTrialExemptAccount(
  account: { email: string; isPlatformAdmin?: boolean | null },
  env: Record<string, string | undefined> = process.env,
): boolean {
  if (account.isPlatformAdmin) return true;
  return parseExemptEmails(env.TRIAL_EXEMPT_EMAILS).has(account.email.trim().toLowerCase());
}

/** Prolonge un essai de `days` jours à partir de sa fin, ou d'aujourd'hui s'il est déjà échu. */
export function extendTrialEnd(current: Date | null, days: number, now: Date = new Date()): Date {
  const base = current && current.getTime() > now.getTime() ? current : now;
  return new Date(base.getTime() + days * DAY_MS);
}
