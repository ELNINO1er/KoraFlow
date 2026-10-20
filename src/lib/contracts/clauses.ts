/**
 * Bibliothèque de clauses contractuelles types (aide à la rédaction).
 *
 * Ce sont des MODÈLES à adapter au contexte : ils ne garantissent aucune
 * validité ni conformité juridique. Texte en alphabet latin (compatible avec le
 * rendu PDF). Chaque clause s'insère comme un article distinct.
 */

export interface ContractClause {
  key: string;
  label: string;
  group: "Structure" | "Obligations" | "Finances" | "Protection" | "Fin & litiges";
  body: string;
}

export const CONTRACT_CLAUSES: ContractClause[] = [
  {
    key: "duration",
    label: "Durée",
    group: "Structure",
    body:
      "ARTICLE - DUREE\nLe présent contrat prend effet à sa signature et se poursuit jusqu'à la complète exécution des prestations décrites. Toute prolongation fera l'objet d'un avenant écrit signé des deux parties.",
  },
  {
    key: "scope",
    label: "Objet & périmètre",
    group: "Structure",
    body:
      "ARTICLE - OBJET ET PERIMETRE\nLe Prestataire réalise pour le Client les prestations détaillées dans le devis de référence. Toute prestation non prévue au devis fera l'objet d'un accord écrit préalable et d'une facturation complémentaire.",
  },
  {
    key: "deliverables",
    label: "Livrables",
    group: "Structure",
    body:
      "ARTICLE - LIVRABLES ET DELAIS\nLes livrables et le calendrier indicatif sont ceux convenus avec le Client. Les délais courent à compter de la réception des éléments nécessaires et du versement de l'acompte éventuel.",
  },
  {
    key: "provider_obligations",
    label: "Obligations du Prestataire",
    group: "Obligations",
    body:
      "ARTICLE - OBLIGATIONS DU PRESTATAIRE\nLe Prestataire s'engage à exécuter les prestations avec professionnalisme et diligence, dans le respect des règles de l'art, et à tenir le Client informé de l'avancement.",
  },
  {
    key: "client_obligations",
    label: "Obligations du Client",
    group: "Obligations",
    body:
      "ARTICLE - OBLIGATIONS DU CLIENT\nLe Client s'engage à fournir en temps utile les informations, accès et contenus nécessaires, à désigner un interlocuteur, et à valider les livrables dans les délais convenus.",
  },
  {
    key: "payment",
    label: "Modalités de paiement",
    group: "Finances",
    body:
      "ARTICLE - MODALITES DE PAIEMENT\nLes sommes dues sont payables selon l'échéancier convenu. Tout retard de paiement pourra entraîner la suspension des prestations après mise en demeure restée sans effet.",
  },
  {
    key: "ip",
    label: "Propriété intellectuelle",
    group: "Protection",
    body:
      "ARTICLE - PROPRIETE INTELLECTUELLE\nLe transfert des droits sur les livrables n'intervient qu'après paiement intégral. Le Prestataire conserve la propriété de ses savoir-faire, méthodes et outils préexistants.",
  },
  {
    key: "confidentiality",
    label: "Confidentialité",
    group: "Protection",
    body:
      "ARTICLE - CONFIDENTIALITE\nChaque partie s'engage à préserver la confidentialité des informations échangées dans le cadre du contrat et à ne pas les divulguer à des tiers sans accord écrit préalable.",
  },
  {
    key: "data",
    label: "Données personnelles",
    group: "Protection",
    body:
      "ARTICLE - DONNEES PERSONNELLES\nLes parties traitent les données personnelles conformément à la réglementation applicable, pour les seules finalités du contrat, et mettent en oeuvre des mesures de sécurité appropriées.",
  },
  {
    key: "liability",
    label: "Responsabilité",
    group: "Protection",
    body:
      "ARTICLE - RESPONSABILITE\nLa responsabilité du Prestataire est limitée aux dommages directs et prouvés, dans la limite des sommes effectivement perçues au titre du contrat. Les dommages indirects sont exclus.",
  },
  {
    key: "force_majeure",
    label: "Force majeure",
    group: "Fin & litiges",
    body:
      "ARTICLE - FORCE MAJEURE\nAucune des parties ne pourra être tenue responsable d'un manquement résultant d'un cas de force majeure. Les obligations affectées sont suspendues pendant la durée de l'événement.",
  },
  {
    key: "termination",
    label: "Résiliation",
    group: "Fin & litiges",
    body:
      "ARTICLE - RESILIATION\nEn cas de manquement grave non réparé dans un délai de quinze (15) jours après mise en demeure, chaque partie peut résilier le contrat de plein droit, sans préjudice des sommes dues.",
  },
  {
    key: "amendment",
    label: "Avenant / modification",
    group: "Fin & litiges",
    body:
      "ARTICLE - MODIFICATION\nToute modification du présent contrat doit faire l'objet d'un avenant écrit signé des deux parties. Aucune modification verbale ne saurait engager les parties.",
  },
  {
    key: "law",
    label: "Litiges & droit applicable",
    group: "Fin & litiges",
    body:
      "ARTICLE - REGLEMENT DES LITIGES\nLes parties s'efforceront de régler à l'amiable tout différend. A défaut d'accord, le litige sera soumis aux juridictions compétentes du ressort du Prestataire, selon le droit applicable.",
  },
];

export const CLAUSE_GROUPS = [
  "Structure",
  "Obligations",
  "Finances",
  "Protection",
  "Fin & litiges",
] as const;
