/**
 * Données de DÉMONSTRATION pour le tableau de bord.
 *
 * ⚠️ Ce ne sont PAS des données réelles. Elles servent uniquement à visualiser
 * la mise en page en attendant les modules CRM, devis et paiements (sprints 2 à 5),
 * qui alimenteront ces indicateurs avec de vraies valeurs par organisation.
 * Le tableau de bord affiche un bandeau explicite le signalant.
 */

export interface DemoStat {
  key: string;
  label: string;
  value: number; // brut ; formaté à l'affichage
  isCurrency?: boolean;
  deltaLabel: string;
  deltaPositive: boolean;
}

export const DEMO_STATS: DemoStat[] = [
  { key: "prospects", label: "Prospects", value: 248, deltaLabel: "+12% ce mois-ci", deltaPositive: true },
  { key: "quotes", label: "Devis en attente", value: 18, deltaLabel: "+6% ce mois-ci", deltaPositive: true },
  { key: "payments", label: "Paiements reçus", value: 4_320_000, isCurrency: true, deltaLabel: "+28% ce mois-ci", deltaPositive: true },
  { key: "projects", label: "Projets actifs", value: 7, deltaLabel: "+2 nouveaux", deltaPositive: true },
];

export const DEMO_REVENUE: { month: string; value: number }[] = [
  { month: "Jan", value: 1_200_000 },
  { month: "Fév", value: 1_050_000 },
  { month: "Mar", value: 1_600_000 },
  { month: "Avr", value: 1_450_000 },
  { month: "Mai", value: 2_100_000 },
  { month: "Juin", value: 1_900_000 },
  { month: "Juil", value: 2_400_000 },
  { month: "Aoû", value: 2_250_000 },
  { month: "Sep", value: 3_100_000 },
  { month: "Oct", value: 3_500_000 },
  { month: "Nov", value: 4_050_000 },
  { month: "Déc", value: 4_600_000 },
];

export interface DemoActivity {
  id: string;
  title: string;
  subtitle: string;
  time: string;
  tone: "accent" | "primary" | "success" | "warning";
}

export const DEMO_ACTIVITY: DemoActivity[] = [
  { id: "1", title: "Nouveau prospect ajouté", subtitle: "Société Baobab Services", time: "il y a 2 h", tone: "accent" },
  { id: "2", title: "Rendez-vous confirmé", subtitle: "Avec Mme Kouassi", time: "il y a 4 h", tone: "primary" },
  { id: "3", title: "Devis envoyé", subtitle: "DV-2025-014 · 1 200 000 FCFA", time: "il y a 6 h", tone: "primary" },
  { id: "4", title: "Paiement reçu", subtitle: "850 000 FCFA via Orange Money", time: "il y a 1 j", tone: "success" },
  { id: "5", title: "Projet mis à jour", subtitle: "Refonte site web · 60%", time: "il y a 1 j", tone: "warning" },
];

export interface DemoProject {
  id: string;
  name: string;
  client: string;
  progress: number;
  due: string;
}

export const DEMO_PROJECTS: DemoProject[] = [
  { id: "1", name: "Site e-commerce", client: "Kora Market", progress: 80, due: "15 juin 2025" },
  { id: "2", name: "Application mobile", client: "AgriPlus", progress: 45, due: "30 juillet 2025" },
  { id: "3", name: "Système de gestion", client: "Clinique Santé+", progress: 70, due: "12 août 2025" },
];

export interface DemoMobileMoney {
  provider: string;
  initial: string;
  amountMinor: number;
  transactions: number;
  colorClass: string;
}

export const DEMO_MOBILE_MONEY: DemoMobileMoney[] = [
  { provider: "Wave", initial: "W", amountMinor: 1_240_000, transactions: 12, colorClass: "bg-[#1DC3EB]" },
  { provider: "Orange Money", initial: "O", amountMinor: 1_850_000, transactions: 18, colorClass: "bg-[#FF7900]" },
  { provider: "MTN", initial: "M", amountMinor: 1_230_000, transactions: 11, colorClass: "bg-[#F5B700]" },
];
