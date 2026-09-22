"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_ITEMS } from "./nav-items";

/** Sidebar claire, item actif en pastille terracotta (cf. maquette). */
export function Sidebar() {
  const pathname = usePathname();

  return (
    <aside className="hidden w-64 shrink-0 flex-col border-r border-border bg-surface lg:flex">
      <div className="flex h-16 items-center gap-2 px-5">
        <span className="font-display text-xl font-bold tracking-tight text-primary">
          Kora<span className="text-accent">Flow</span>
        </span>
      </div>
      <p className="px-5 pb-4 text-xs text-muted-foreground">
        Plus loin, ensemble
      </p>

      <nav className="flex flex-1 flex-col gap-1 px-3">
        {NAV_ITEMS.map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                active
                  ? "bg-accent text-accent-foreground"
                  : "text-muted-foreground hover:bg-muted hover:text-foreground",
              )}
            >
              <Icon className="size-5 shrink-0" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-border p-5">
        <p className="text-sm font-medium text-foreground">
          Des idées aux résultats.
        </p>
        <span className="mt-2 block h-1 w-8 rounded-full bg-accent" />
      </div>
    </aside>
  );
}
