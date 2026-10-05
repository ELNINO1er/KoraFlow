import { formatCurrency } from "@/lib/formatting/currency";
import { cn } from "@/lib/utils";

/**
 * Affichage de montant cohérent. `minor` = entier dans la plus petite unité de
 * la devise (convention KoraFlow). `tabular` aligne les chiffres (listes).
 */
export function Money({
  minor,
  currency,
  locale = "fr-FR",
  tabular = false,
  className,
}: {
  minor: number;
  currency: string;
  locale?: string;
  tabular?: boolean;
  className?: string;
}) {
  return (
    <span className={cn(tabular ? "tabular-nums" : undefined, className)}>
      {formatCurrency(minor, currency, locale)}
    </span>
  );
}
