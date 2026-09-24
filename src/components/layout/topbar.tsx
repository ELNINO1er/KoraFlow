import { OrgSwitcher, type OrgOption } from "./org-switcher";
import { UserMenu } from "./user-menu";
import { NotificationBell, type NotificationItem } from "./notification-bell";
import { GlobalSearch } from "./global-search";

export function Topbar({
  user,
  organizations,
  activeOrgId,
  notifications,
  unread,
  localeTag,
  isPlatformAdmin = false,
}: {
  user: { name: string | null; email: string; image: string | null };
  organizations: OrgOption[];
  activeOrgId: string;
  notifications: NotificationItem[];
  unread: number;
  localeTag: string;
  isPlatformAdmin?: boolean;
}) {
  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-3 border-b border-border bg-surface px-4 lg:px-6">
      <GlobalSearch />

      <div className="flex flex-1 items-center justify-end gap-2 sm:flex-none">
        <NotificationBell notifications={notifications} unread={unread} localeTag={localeTag} />

        <OrgSwitcher organizations={organizations} activeId={activeOrgId} />
        <UserMenu name={user.name} email={user.email} image={user.image} isPlatformAdmin={isPlatformAdmin} />
      </div>
    </header>
  );
}
