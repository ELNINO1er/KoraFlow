import { BrandLogo } from "./brand-logo";

export function PoweredByAlymero({ className = "" }: { className?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 text-xs text-muted-foreground ${className}`}
    >
      <span>via</span>
      <BrandLogo className="gap-1 text-xs text-foreground" iconClassName="size-4" />
    </span>
  );
}
