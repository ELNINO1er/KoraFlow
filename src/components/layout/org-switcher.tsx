"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { setActiveOrganization } from "@/features/organizations/actions";

export interface OrgOption {
  id: string;
  name: string;
}

export function OrgSwitcher({
  organizations,
  activeId,
}: {
  organizations: OrgOption[];
  activeId: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const active = organizations.find((o) => o.id === activeId) ?? organizations[0];

  function select(id: string) {
    if (id === activeId) return;
    startTransition(async () => {
      await setActiveOrganization(id);
      router.refresh();
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={pending}
        className="flex items-center gap-2 rounded-lg border border-border bg-surface px-2 py-1.5 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Avatar className="h-8 w-8">
          <AvatarFallback>
            {(active?.name ?? "?").charAt(0).toUpperCase()}
          </AvatarFallback>
        </Avatar>
        <span className="hidden sm:flex sm:flex-col">
          <span className="text-sm font-semibold leading-tight text-foreground">
            {active?.name}
          </span>
          <span className="text-xs leading-tight text-muted-foreground">
            Mon entreprise
          </span>
        </span>
        <ChevronsUpDown className="size-4 text-muted-foreground" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="min-w-56">
        <DropdownMenuLabel>Organisations</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {organizations.map((org) => (
          <DropdownMenuCheckboxItem
            key={org.id}
            checked={org.id === activeId}
            onSelect={(e) => {
              e.preventDefault();
              select(org.id);
            }}
          >
            {org.name}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
