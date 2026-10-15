import Image from "next/image";
import { cn } from "@/lib/utils";

type BrandLogoProps = {
  className?: string;
  iconClassName?: string;
  iconOnly?: boolean;
  priority?: boolean;
};

/** Identite Alymero partagee par les surfaces publiques, privees et admin. */
export function BrandLogo({
  className,
  iconClassName,
  iconOnly = false,
  priority = false,
}: BrandLogoProps) {
  return (
    <span
      className={cn("inline-flex shrink-0 items-center gap-2.5", className)}
      aria-label={iconOnly ? "Alymero" : undefined}
    >
      <Image
        src="/brand/alymero-mark.png"
        alt=""
        width={64}
        height={64}
        priority={priority}
        className={cn("size-8 shrink-0 object-contain", iconClassName)}
      />
      {iconOnly ? null : (
        <span className="font-display font-bold tracking-tight">Alymero</span>
      )}
    </span>
  );
}
