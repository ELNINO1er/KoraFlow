import { cn } from "@/lib/utils";

type DateInput = Date | string | number;
type DateVariant = "short" | "long" | "datetime" | "time";

const OPTIONS: Record<DateVariant, Intl.DateTimeFormatOptions> = {
  short: { day: "2-digit", month: "2-digit", year: "numeric" },
  long: { weekday: "long", day: "numeric", month: "long", year: "numeric" },
  datetime: { day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit" },
  time: { hour: "2-digit", minute: "2-digit" },
};

function toDate(value: DateInput): Date {
  return value instanceof Date ? value : new Date(value);
}

/**
 * Affichage de date cohérent dans toute l'application (balise sémantique
 * `<time>`). `utc` formate en UTC et ajoute « (UTC) » — utile pour les créneaux
 * de rendez-vous. Pour les chaînes hors JSX, utiliser les helpers de
 * `@/lib/formatting/currency`.
 */
export function DateText({
  value,
  variant = "short",
  locale = "fr-FR",
  utc = false,
  className,
}: {
  value: DateInput;
  variant?: DateVariant;
  locale?: string;
  utc?: boolean;
  className?: string;
}) {
  const date = toDate(value);
  const options = utc ? { ...OPTIONS[variant], timeZone: "UTC" } : OPTIONS[variant];
  const text = new Intl.DateTimeFormat(locale, options).format(date);
  return (
    <time dateTime={date.toISOString()} className={cn(variant === "long" ? "capitalize" : undefined, className)}>
      {utc ? `${text} (UTC)` : text}
    </time>
  );
}
