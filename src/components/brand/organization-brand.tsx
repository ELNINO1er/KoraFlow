import Image from "next/image";
import { cn } from "@/lib/utils";

export function OrganizationBrand({
  id,
  name,
  hasLogo,
  className,
  imageClassName,
  showName = true,
  priority = false,
}: {
  id: string;
  name: string;
  hasLogo: boolean;
  className?: string;
  imageClassName?: string;
  showName?: boolean;
  priority?: boolean;
}) {
  const initials = name.trim().slice(0, 2).toUpperCase() || "OR";
  return (
    <span className={cn("inline-flex min-w-0 items-center gap-2.5", className)}>
      {hasLogo ? (
        <Image
          src={`/api/organization-logos/${id}`}
          alt={`Logo de ${name}`}
          width={64}
          height={64}
          unoptimized
          priority={priority}
          className={cn("size-9 shrink-0 rounded-lg bg-white object-contain p-0.5", imageClassName)}
        />
      ) : (
        <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent/15 text-xs font-bold text-accent", imageClassName)} aria-hidden="true">
          {initials}
        </span>
      )}
      {showName ? <span className="truncate font-display font-bold tracking-tight">{name}</span> : null}
    </span>
  );
}
