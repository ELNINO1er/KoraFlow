import type { MembershipRole } from "@prisma/client";

/**
 * Matrice de permissions RBAC — source de vérité, vérifiée côté serveur.
 * Voir la matrice fonctionnelle du cahier des charges (§11).
 *
 * Un permission est de la forme `${resource}.${action}`.
 * La portée « ses propres » (own) N'EST PAS gérée ici : elle est appliquée dans
 * la couche services (ex. un CLIENT ne voit que ses propres devis). Cette matrice
 * ne décide que du droit d'accès au type de ressource et à l'action.
 */

export const RESOURCES = [
  "organization",
  "members",
  "contacts",
  "services",
  "forms",
  "appointments",
  "quotes",
  "contracts",
  "invoices",
  "payments",
  "projects",
  "reports",
  "auditLog",
] as const;
export type Resource = (typeof RESOURCES)[number];

export const ACTIONS = ["view", "create", "update", "delete", "manage"] as const;
export type Action = (typeof ACTIONS)[number];

export type Permission = `${Resource}.${Action}`;

/** Développe une liste de motifs (`*.*`, `quotes.*`, `invoices.view`) en permissions concrètes. */
function expand(patterns: string[]): Set<Permission> {
  const result = new Set<Permission>();
  for (const pattern of patterns) {
    const [res, act] = pattern.split(".") as [string, string];
    const resources = res === "*" ? RESOURCES : [res as Resource];
    const actions = act === "*" ? ACTIONS : [act as Action];
    for (const r of resources) {
      for (const a of actions) {
        result.add(`${r}.${a}` as Permission);
      }
    }
  }
  return result;
}

/**
 * Droits par rôle. Les motifs sont développés une fois au chargement du module.
 * Règles clés :
 *  - OWNER : contrôle total.
 *  - ADMIN : total SAUF la suppression de l'organisation (réservée au propriétaire).
 *  - CLIENT : aucun droit d'administration (le portail est géré séparément, en own).
 */
const ROLE_PATTERNS: Record<MembershipRole, string[]> = {
  OWNER: ["*.*"],
  ADMIN: [
    "*.*",
    // retrait explicite plus bas
  ],
  SALES: [
    "contacts.view",
    "contacts.create",
    "contacts.update",
    "services.view",
    "forms.view",
    "forms.create",
    "forms.update",
    "appointments.view",
    "appointments.create",
    "appointments.update",
    "quotes.view",
    "quotes.create",
    "quotes.update",
    "contracts.view",
    "contracts.create",
    "contracts.update",
    "invoices.view",
    "payments.view",
    "projects.view",
    "reports.view",
  ],
  PROJECT_MANAGER: [
    "projects.*",
    "contacts.view",
    "quotes.view",
    "contracts.view",
    "invoices.view",
    "payments.view",
    "appointments.view",
    "services.view",
    "reports.view",
  ],
  ACCOUNTANT: [
    "organization.view",
    "invoices.*",
    "payments.*",
    "quotes.view",
    "contracts.view",
    "contacts.view",
    "reports.view",
  ],
  COLLABORATOR: [
    "contacts.view",
    "services.view",
    "projects.view",
    "projects.update",
    "appointments.view",
    "quotes.view",
  ],
  CLIENT: [],
};

const ROLE_PERMISSIONS: Record<MembershipRole, Set<Permission>> = {
  OWNER: expand(ROLE_PATTERNS.OWNER),
  ADMIN: (() => {
    const set = expand(ROLE_PATTERNS.ADMIN);
    // L'ADMIN ne peut pas supprimer l'organisation (réservé au propriétaire).
    set.delete("organization.delete");
    return set;
  })(),
  SALES: expand(ROLE_PATTERNS.SALES),
  PROJECT_MANAGER: expand(ROLE_PATTERNS.PROJECT_MANAGER),
  ACCOUNTANT: expand(ROLE_PATTERNS.ACCOUNTANT),
  COLLABORATOR: expand(ROLE_PATTERNS.COLLABORATOR),
  CLIENT: expand(ROLE_PATTERNS.CLIENT),
};

/** Renvoie l'ensemble (figé) des permissions d'un rôle. */
export function permissionsForRole(role: MembershipRole): ReadonlySet<Permission> {
  return ROLE_PERMISSIONS[role];
}

/** Indique si un rôle possède une permission donnée. */
export function can(role: MembershipRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role].has(permission);
}

/** Variante « lève une erreur » pour usage en garde de service. */
export class PermissionError extends Error {
  constructor(role: MembershipRole, permission: Permission) {
    super(`Rôle ${role} non autorisé pour ${permission}`);
    this.name = "PermissionError";
  }
}

export function assertCan(role: MembershipRole, permission: Permission): void {
  if (!can(role, permission)) {
    throw new PermissionError(role, permission);
  }
}
