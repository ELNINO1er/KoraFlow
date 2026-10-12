"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { ChevronsUpDown, Building2 } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
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
        aria-label="Changer d'organisation"
        className="flex max-w-[12rem] items-center gap-2 rounded-md border border-border bg-surface px-2.5 py-2 text-left transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Building2 className="size-4 shrink-0 text-muted-foreground" />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-sm font-semibold leading-tight text-foreground">
            {active?.name}
          </span>
          <span className="hidden text-xs leading-tight text-muted-foreground sm:block">
            Mon entreprise
          </span>
        </span>
        <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
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
