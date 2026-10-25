"use client";

import { useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  LogOut,
  User as UserIcon,
  ShieldAlert,
  ChevronDown,
  Settings,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { authClient } from "@/server/auth/auth-client";
import { setActiveOrganization } from "@/features/organizations/actions";
import type { OrgOption } from "./org-switcher";

/**
 * Menu unique « compte + organisation » dans le header (à droite).
 * Fusionne l'ancien sélecteur d'organisation et le menu profil : un seul bloc,
 * un clic ouvre tout (changer d'organisation, mon compte, déconnexion).
 */
export function UserMenu({
  name,
  email,
  image,
  isPlatformAdmin = false,
  organizations = [],
  activeOrgId,
}: {
  name: string | null;
  email: string;
  image: string | null;
  isPlatformAdmin?: boolean;
  organizations?: OrgOption[];
  activeOrgId?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const initials = (name ?? email).charAt(0).toUpperCase();

  function signOut() {
    startTransition(async () => {
      await authClient.signOut();
      router.push("/login");
      router.refresh();
    });
  }

  function selectOrg(id: string) {
    if (id === activeOrgId) return;
    startTransition(async () => {
      await setActiveOrganization(id);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        aria-label="Compte et organisation"
        disabled={pending}
        className="flex h-11 items-center gap-2 rounded-xl border border-border bg-surface px-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-60"
      >
        <Avatar className="size-7">
          {image ? <AvatarImage src={image} alt={name ?? email} /> : null}
          <AvatarFallback>{initials}</AvatarFallback>
        </Avatar>
        <span className="hidden max-w-[9rem] truncate text-sm font-medium text-foreground sm:block">
          {name ?? "Utilisateur"}
        </span>
        <ChevronDown className="size-4 shrink-0 text-muted-foreground" />
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end" className="min-w-60">
        <DropdownMenuLabel>
          <span className="block text-sm font-medium text-foreground">
            {name ?? "Utilisateur"}
          </span>
          <span className="block truncate text-xs text-muted-foreground">{email}</span>
        </DropdownMenuLabel>

        {organizations.length > 0 ? (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuLabel className="text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
              Organisation
            </DropdownMenuLabel>
            {organizations.map((org) => (
              <DropdownMenuCheckboxItem
                key={org.id}
                checked={org.id === activeOrgId}
                onSelect={(e) => {
                  e.preventDefault();
                  selectOrg(org.id);
                }}
              >
                {org.name}
              </DropdownMenuCheckboxItem>
            ))}
            <DropdownMenuItem asChild>
              <Link href="/parametres">
                <Settings className="size-4" />
                Paramètres de l&apos;entreprise
              </Link>
            </DropdownMenuItem>
          </>
        ) : null}

        <DropdownMenuSeparator />
        <DropdownMenuItem asChild>
          <Link href="/compte">
            <UserIcon className="size-4" />
            Mon compte
          </Link>
        </DropdownMenuItem>
        {isPlatformAdmin ? (
          <DropdownMenuItem asChild>
            <Link href="/admin" className="text-accent focus:bg-accent/10">
              <ShieldAlert className="size-4" />
              Console plateforme
            </Link>
          </DropdownMenuItem>
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
