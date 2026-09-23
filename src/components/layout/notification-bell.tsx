"use client";

import { useTransition } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Bell } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { markAllReadAction } from "@/features/notifications/actions";

export interface NotificationItem {
  id: string;
  title: string;
  body: string | null;
  link: string | null;
  readAt: Date | null;
  createdAt: Date;
}

export function NotificationBell({
  notifications,
  unread,
  localeTag,
}: {
  notifications: NotificationItem[];
  unread: number;
  localeTag: string;
}) {
  const router = useRouter();
  const [, startTransition] = useTransition();
  const dtf = new Intl.DateTimeFormat(localeTag, { dateStyle: "short", timeStyle: "short", timeZone: "UTC" });

  function onOpenChange(open: boolean) {
    if (open && unread > 0) {
      startTransition(async () => {
        await markAllReadAction();
        router.refresh();
      });
    }
  }

  return (
    <DropdownMenu onOpenChange={onOpenChange}>
      <DropdownMenuTrigger
        aria-label="Notifications"
        className="relative inline-flex size-10 items-center justify-center rounded-full text-muted-foreground transition-colors hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      >
        <Bell className="size-5" />
        {unread > 0 ? (
          <span className="absolute right-1.5 top-1.5 flex min-w-4 items-center justify-center rounded-full bg-accent px-1 text-[10px] font-semibold text-accent-foreground">
            {unread > 9 ? "9+" : unread}
          </span>
        ) : null}
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel>Notifications</DropdownMenuLabel>
        <DropdownMenuSeparator />
        {notifications.length === 0 ? (
          <p className="px-2 py-6 text-center text-sm text-muted-foreground">Aucune notification.</p>
        ) : (
          <ul className="max-h-96 overflow-y-auto">
            {notifications.map((n) => {
              const content = (
                <div className={`flex flex-col gap-0.5 rounded-md px-2 py-2 ${n.readAt ? "" : "bg-accent/5"}`}>
                  <span className="text-sm font-medium text-foreground">{n.title}</span>
                  {n.body ? <span className="text-xs text-muted-foreground">{n.body}</span> : null}
                  <span className="text-[11px] text-muted-foreground">{dtf.format(n.createdAt)}</span>
                </div>
              );
              return (
                <li key={n.id}>
                  {n.link ? <Link href={n.link}>{content}</Link> : content}
                </li>
              );
            })}
          </ul>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
