import {
  LayoutDashboard,
  Users,
  CalendarDays,
  FileText,
  ScrollText,
  ReceiptText,
  FolderKanban,
  Package,
  FormInput,
  Users2,
  BarChart3,
  type LucideIcon,
} from "lucide-react";

export interface NavItem {
  label: string;
  href: string;
  icon: LucideIcon;
}

/** Navigation principale (menu administratif §12). */
export const NAV_ITEMS: NavItem[] = [
  { label: "Tableau de bord", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Rendez-vous", href: "/rendez-vous", icon: CalendarDays },
  { label: "Devis", href: "/devis", icon: FileText },
  { label: "Contrats", href: "/contrats", icon: ScrollText },
  { label: "Factures", href: "/factures", icon: ReceiptText },
  { label: "Projets", href: "/projets", icon: FolderKanban },
];

/** Navigation secondaire (configuration §12). */
export const SECONDARY_NAV_ITEMS: NavItem[] = [
  { label: "Rapports", href: "/rapports", icon: BarChart3 },
  { label: "Formulaires", href: "/formulaires", icon: FormInput },
  { label: "Catalogue de services", href: "/services", icon: Package },
  { label: "Équipe", href: "/equipe", icon: Users2 },
];

/** Navigation mobile (bottom-nav §12). */
export const MOBILE_NAV_ITEMS: NavItem[] = [
  { label: "Accueil", href: "/dashboard", icon: LayoutDashboard },
  { label: "Clients", href: "/clients", icon: Users },
  { label: "Devis", href: "/devis", icon: FileText },
  { label: "Factures", href: "/factures", icon: ReceiptText },
  { label: "Projets", href: "/projets", icon: FolderKanban },
];
