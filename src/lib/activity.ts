/** Libellés lisibles pour les actions du journal d'audit (tableau de bord). */
const ACTION_LABELS: Record<string, string> = {
  "organization.created": "Organisation créée",
  "contact.created": "Nouveau contact",
  "contact.deleted": "Contact supprimé",
  "service.created": "Service ajouté",
  "service.updated": "Service modifié",
  "quote.created": "Devis créé",
  "quote.status_changed": "Devis mis à jour",
  "quote.accepted_by_client": "Devis accepté par le client",
  "quote.rejected_by_client": "Devis refusé par le client",
  "contract.created": "Contrat généré",
  "contract.status_changed": "Contrat mis à jour",
  "contract.signed_by_client": "Contrat signé",
  "invoice.created": "Facture créée",
  "invoice.status_changed": "Facture mise à jour",
  "payment.declared_by_client": "Paiement déclaré",
  "payment.confirmed": "Paiement confirmé",
  "payment.rejected": "Paiement rejeté",
  "payment.recorded": "Paiement enregistré",
};

export function actionLabel(action: string): string {
  return ACTION_LABELS[action] ?? action;
}

/** Temps relatif court en français (« il y a 2 h »). */
export function relativeTime(date: Date, nowMs: number, locale = "fr-FR"): string {
  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: "auto" });
  const diffSec = Math.round((date.getTime() - nowMs) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return rtf.format(Math.round(diffSec / 1), "second");
  if (abs < 3600) return rtf.format(Math.round(diffSec / 60), "minute");
  if (abs < 86400) return rtf.format(Math.round(diffSec / 3600), "hour");
  if (abs < 2592000) return rtf.format(Math.round(diffSec / 86400), "day");
  return rtf.format(Math.round(diffSec / 2592000), "month");
}
