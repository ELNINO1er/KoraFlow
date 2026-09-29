"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, SECONDARY_NAV_ITEMS } from "./nav-items";

const KEY = "kf-sidebar-collapsed";
const EVENT = "kf-sidebar";

function subscribe(cb: () => void) {
  if (typeof window === "undefined") return () => {};
  window.addEventListener(EVENT, cb);
  window.addEventListener("storage", cb);
  return () => {
    window.removeEventListener(EVENT, cb);
    window.removeEventListener("storage", cb);
  };
}
function getSnapshot() {
  return window.localStorage.getItem(KEY) === "1";
}
function getServerSnapshot() {
  return false;
}

/** Sidebar claire et repliable (desktop), item actif en pastille terracotta. */
export function Sidebar() {
  const pathname = usePathname();
  const collapsed = useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);

  const toggle = useCallback(() => {
    const next = !getSnapshot();
    window.localStorage.setItem(KEY, next ? "1" : "0");
    window.dispatchEvent(new Event(EVENT));
  }, []);

  function renderItem(item: (typeof NAV_ITEMS)[number]) {
    const active = pathname === item.href || pathname.startsWith(`${item.href}/`);
    const Icon = item.icon;
    return (
      <Link
        key={item.href}
        href={item.href}
        title={collapsed ? item.label : undefined}
        aria-label={item.label}
        className={cn(
          "flex items-center gap-3 rounded-lg py-2.5 text-sm font-medium transition-colors",
          collapsed ? "justify-center px-2" : "px-3",
          active
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground hover:bg-muted hover:text-foreground",
        )}
      >
        <Icon className="size-5 shrink-0" />
        {collapsed ? null : item.label}
      </Link>
    );
  }

  return (
    <aside
      className={cn(
        "hidden shrink-0 flex-col border-r border-border bg-surface transition-[width] duration-200 lg:flex",
        collapsed ? "w-16" : "w-64",
      )}
    >
      <div className={cn("flex h-16 items-center", collapsed ? "justify-center px-2" : "justify-between px-5")}>
        {collapsed ? (
          <span className="font-display text-xl font-bold tracking-tight text-accent">K</span>
        ) : (
          <span className="font-display text-xl font-bold tracking-tight text-primary">
            Kora<span className="text-accent">Flow</span>
          </span>
        )}
        {collapsed ? null : (
          <button
            type="button"
            onClick={toggle}
            aria-label="Réduire le menu"
            className="rounded-lg p-1.5 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeftClose className="size-4" />
          </button>
        )}
      </div>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map(renderItem)}

        <div className="my-3 border-t border-border" />
        {collapsed ? null : (
          <p className="px-3 pb-1 text-xs font-medium uppercase tracking-wide text-muted-foreground">
            Configuration
          </p>
        )}
        {SECONDARY_NAV_ITEMS.map(renderItem)}
      </nav>

      <div className="border-t border-border p-3">
        {collapsed ? (
          <button
            type="button"
            onClick={toggle}
            aria-label="Déployer le menu"
            className="flex w-full items-center justify-center rounded-lg p-2 text-muted-foreground hover:bg-muted hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            <PanelLeftOpen className="size-5" />
          </button>
        ) : (
          <div className="px-2">
            <p className="text-sm font-medium text-foreground">Des idées aux résultats.</p>
            <span className="mt-2 block h-1 w-8 rounded-full bg-accent" />
          </div>
        )}
      </div>
    </aside>
  );
}
