import type { LucideIcon } from "lucide-react";

/** État « module à venir » réutilisable pour les sections non encore développées. */
export function ComingSoon({
  title,
  description,
  icon: Icon,
  sprint,
}: {
  title: string;
  description: string;
  icon: LucideIcon;
  sprint: string;
}) {
  return (
    <div className="mx-auto max-w-7xl">
      <h1 className="font-display text-2xl font-bold text-foreground">{title}</h1>
      <div className="mt-6 flex flex-col items-center justify-center rounded-xl border border-dashed border-border bg-surface p-12 text-center sm:p-16">
        <span className="flex size-16 items-center justify-center rounded-full bg-muted">
          <Icon className="size-7 text-muted-foreground" />
        </span>
        <p className="mt-4 font-display text-lg font-semibold text-foreground">
          Module en cours de construction
        </p>
        <p className="mt-1 max-w-md text-sm text-muted-foreground">{description}</p>
        <span className="mt-4 rounded-full border border-border px-3 py-1 text-xs text-muted-foreground">
          Prévu au {sprint}
        </span>
      </div>
    </div>
  );
}
