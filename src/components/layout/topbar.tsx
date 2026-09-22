import { Bell, Search } from "lucide-react";
import { OrgSwitcher, type OrgOption } from "./org-switcher";
import { UserMenu } from "./user-menu";

export function Topbar({
  user,
  organizations,
  activeOrgId,
}: {
  user: { name: string | null; email: string; image: string | null };
  organizations: OrgOption[];
  activeOrgId: string;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <div className="relative hidden max-w-xl flex-1 sm:block">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          placeholder="Rechercher un client, un devis, une facture…"
          className="h-10 w-full rounded-full border border-border bg-background pl-9 pr-4 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <button
          type="button"
          aria-label="Notifications"
          className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Bell className="size-5" />
          <span className="absolute right-1.5 top-1.5 flex size-4 items-center justify-center rounded-full bg-accent text-[10px] font-semibold text-accent-foreground">
            3
          </span>
        </button>

        <OrgSwitcher organizations={organizations} activeId={activeOrgId} />
        <UserMenu name={user.name} email={user.email} image={user.image} />
      </div>
    </header>
  );
}
