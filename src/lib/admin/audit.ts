export const PLATFORM_AUDIT_LABELS: Record<string, string> = {
  "platform.two_factor_enabled": "Double authentification activée",
  "platform.org_suspended": "Organisation suspendue",
  "platform.org_reactivated": "Organisation réactivée",
  "platform.org_updated": "Profil d’organisation modifié",
  "platform.org_deleted": "Organisation archivée",
  "platform.org_restored": "Organisation restaurée",
  "platform.user_suspended": "Compte suspendu",
  "platform.user_reactivated": "Compte réactivé",
  "platform.user_created": "Compte créé",
  "platform.user_deleted": "Compte supprimé",
  "platform.admin_created": "Compte administrateur créé",
  "platform.admin_granted": "Accès administrateur accordé",
  "platform.admin_revoked": "Accès administrateur retiré",
  "platform.sessions_revoked": "Sessions déconnectées",
  "platform.email_verified": "E-mail marqué comme vérifié",
  "platform.password_reset_sent": "Réinitialisation du mot de passe demandée",
  "platform.impersonation_started": "Session de support ouverte",
  "platform.impersonation_requested": "Session de support demandée",
  "platform.impersonation_stopped": "Session de support fermée",
  "platform.member_added": "Membre ajouté",
  "platform.member_removed": "Membre retiré",
  "platform.member_role_changed": "Rôle d’un membre modifié",
  "platform.org_data_viewed": "Données d’organisation consultées",
};

export function auditTargetHref(type: string | null, id: string | null) {
  if (!id) return null;
  if (type === "Organization") return `/admin/organizations/${encodeURIComponent(id)}`;
  if (type === "User") return `/admin/users/${encodeURIComponent(id)}`;
  return null;
}
