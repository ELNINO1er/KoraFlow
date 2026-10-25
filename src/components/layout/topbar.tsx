import { type OrgOption } from "./org-switcher";
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
    <header className="sticky top-0 z-30 flex h-20 items-center gap-3 bg-background/90 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/75 lg:px-8">
      <div className="ml-auto flex min-w-0 items-center gap-2">
        <GlobalSearch />
        <NotificationBell notifications={notifications} unread={unread} localeTag={localeTag} />

        {/* Bloc unique « compte + organisation », poussé tout à droite. */}
        <UserMenu
          name={user.name}
          email={user.email}
          image={user.image}
          isPlatformAdmin={isPlatformAdmin}
          organizations={organizations}
          activeOrgId={activeOrgId}
        />
      </div>
    </header>
  );
}
