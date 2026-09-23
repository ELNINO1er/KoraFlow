import type { MembershipRole } from "@prisma/client";

export const MEMBERSHIP_ROLES: { value: MembershipRole; label: string }[] = [
  { value: "OWNER", label: "Propriétaire" },
  { value: "ADMIN", label: "Administrateur" },
  { value: "SALES", label: "Commercial" },
  { value: "PROJECT_MANAGER", label: "Chef de projet" },
  { value: "ACCOUNTANT", label: "Comptable" },
  { value: "COLLABORATOR", label: "Collaborateur" },
  { value: "CLIENT", label: "Client" },
];

const MAP = new Map(MEMBERSHIP_ROLES.map((r) => [r.value, r.label]));

export function roleLabel(role: MembershipRole): string {
  return MAP.get(role) ?? role;
}

/** Rôles assignables lors d'une invitation (hors CLIENT, acteur externe). */
export const ASSIGNABLE_ROLES = MEMBERSHIP_ROLES.filter((r) => r.value !== "CLIENT");
