"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, ShieldAlert, ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/server/auth/auth-client";
import { cn } from "@/lib/utils";

/**
 * Menu du compte dans le header (à droite). En « bloc » : avatar + nom + chevron
 * (le nom se masque sur très petit écran). Un clic ouvre le menu.
 */
export function UserMenu({
  name,
  email,
  image,
  isPlatformAdmin = false,
  variant = "block",
}: {
  name: string | null;
  email: string;
  image: string | null;
  isPlatformAdmin?: boolean;
  variant?: "block" | "avatar";
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = (name ?? email).charAt(0).toUpperCase();
  const isBlock = variant === "block";

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Menu du compte"
        className={cn(
          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
          isBlock
            ? "flex items-center gap-2 rounded-md border border-border bg-surface px-2 py-1.5 transition-colors hover:bg-muted"
            : "rounded-full",
        )}
      >
        <Avatar className={cn(isBlock && "size-7")}>
          {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {isBlock ? (
          <>
            <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground sm:block">
              {name ?? "Utilisateur"}
            </span>
            <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">
            {name ?? "Utilisateur"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/compte">
            <UserIcon className="size-4" />
            Mon compte
          </Link>
        </DropdownMenuItem>
        {isPlatformAdmin ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/admin" className="text-accent focus:bg-accent/10">
                <ShieldAlert className="size-4" />
                Console plateforme
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}
        <DropdownMenuSeparator />
        <DropdownMenuItem
          disabled={pending}
          onSelect={(e) => {
            e.preventDefault();
            signOut();
          }}
          className="text-danger focus:bg-danger/10"
        >
          <LogOut className="size-4" />
          Se déconnecter
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
