"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useCallback, useSyncExternalStore } from "react";
import { PanelLeftClose, PanelLeftOpen } from "lucide-react";
import { cn } from "@/lib/utils";
import { OrganizationBrand } from "@/components/brand/organization-brand";
import type { ActiveOrganization } from "@/server/auth/context";
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

/** Sidebar vert foncé (couleur du logo) et repliable (desktop). Le profil vit dans le header. */
export function Sidebar({ organization }: { organization: ActiveOrganization }) {
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
          "flex min-h-11 items-center gap-3 rounded-xl text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
          collapsed ? "justify-center px-2" : "px-3",
          active
            ? "bg-sidebar-active font-semibold text-white"
            : "text-sidebar-foreground hover:bg-sidebar-hover hover:text-white",
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
        "hidden h-dvh shrink-0 flex-col bg-sidebar text-sidebar-foreground transition-[width] duration-200 lg:flex",
        collapsed ? "w-[4.5rem]" : "w-64",
      )}
    >
      <div className={cn("flex h-20 items-center", collapsed ? "justify-center px-2" : "px-5")}>
        {collapsed ? (
          <Link href="/dashboard" aria-label={`${organization.name} — tableau de bord`}>
            <OrganizationBrand id={organization.id} name={organization.name} hasLogo={Boolean(organization.logoUrl)} showName={false} priority imageClassName="bg-white text-sidebar" />
          </Link>
        ) : (
          <Link href="/dashboard" aria-label={`${organization.name} — tableau de bord`}>
            <OrganizationBrand id={organization.id} name={organization.name} hasLogo={Boolean(organization.logoUrl)} priority className="max-w-full text-lg text-white" imageClassName="bg-white text-sidebar" />
          </Link>
        )}
      </div>

      <nav className="kf-sidebar-scroll flex flex-1 flex-col gap-1 overflow-y-auto px-3 py-2">
        {collapsed ? null : (
          <p className="px-3 pb-1 text-xs font-medium tracking-wide text-sidebar-muted">Commercial</p>
        )}
        {NAV_ITEMS.map(renderItem)}

        {collapsed ? (
          <div className="mx-2 my-3 border-t border-sidebar-border" />
        ) : (
          <p className="px-3 pb-1 pt-5 text-xs font-medium tracking-wide text-sidebar-muted">Configuration</p>
        )}
        {SECONDARY_NAV_ITEMS.map(renderItem)}
      </nav>

      <div className="border-t border-sidebar-border p-3">
        <button
          type="button"
          onClick={toggle}
          aria-label={collapsed ? "Déployer le menu" : "Réduire le menu"}
          className={cn(
            "flex min-h-10 w-full items-center gap-2 rounded-xl px-3 text-xs font-medium text-sidebar-muted transition-colors hover:bg-sidebar-hover hover:text-white focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/70",
            collapsed ? "justify-center" : "",
          )}
        >
          {collapsed ? <PanelLeftOpen className="size-5" /> : <PanelLeftClose className="size-4" />}
          {collapsed ? null : "Réduire"}
        </button>
      </div>
    </aside>
  );
}
