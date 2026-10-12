"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { LogOut, User as UserIcon, ShieldAlert, ChevronsUpDown } from "lucide-react";
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

export function UserMenu({
  name,
  email,
  image,
  isPlatformAdmin = false,
  variant = "avatar",
  collapsed = false,
}: {
  name: string | null;
  email: string;
  image: string | null;
  isPlatformAdmin?: boolean;
  /** "avatar" : pastille seule (topbar mobile). "block" : bloc complet (sidebar). */
  variant?: "avatar" | "block";
  collapsed?: boolean;
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
            ? cn(
                "flex w-full items-center gap-3 rounded-lg p-2 text-left transition-colors hover:bg-muted",
                collapsed && "justify-center",
              )
            : "rounded-full",
        )}
      >
        <Avatar className={cn(isBlock ? "size-8 shrink-0" : undefined)}>
          {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        {isBlock && !collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium text-foreground">
                {name ?? "Utilisateur"}
              </span>
              <span className="block truncate text-xs text-muted-foreground">{email}</span>
            </span>
            <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
          </>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={isBlock ? "start" : "end"}
        side={isBlock ? "top" : "bottom"}
        className="min-w-56"
      >
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
