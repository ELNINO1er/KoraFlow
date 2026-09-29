"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from "motion/react";
import { Menu, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useMotionPref } from "./motion-preferences";

const LINKS = [
  { href: "#fonctionnalites", label: "Fonctionnalités" },
  { href: "#solutions", label: "Solutions" },
  { href: "#parcours", label: "Comment ça marche" },
  { href: "#securite", label: "Sécurité" },
  { href: "#tarifs", label: "Tarifs" },
];

export function Header() {
  const { reduced } = useMotionPref();
  const { scrollY } = useScroll();
  const [compact, setCompact] = useState(false);
  const [open, setOpen] = useState(false);

  useMotionValueEvent(scrollY, "change", (v) => setCompact(v > 16));

  // Fermeture du menu mobile au clavier (Échap).
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <motion.header
      initial={reduced ? false : { y: -80, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="fixed inset-x-0 top-0 z-50 px-3 pt-3 sm:px-6"
    >
      <nav
        aria-label="Navigation principale"
        className={`mx-auto flex max-w-6xl items-center justify-between gap-4 rounded-2xl border border-border/70 bg-background/70 px-4 backdrop-blur-md transition-all duration-300 ${
          compact ? "h-13 shadow-md" : "h-16"
        }`}
      >
        <Link href="/" className="font-display text-xl font-bold tracking-tight text-foreground">
          Kora<span className="text-accent">Flow</span>
        </Link>

        <div className="hidden items-center gap-7 text-sm font-medium text-muted-foreground lg:flex">
          {LINKS.map((l) => (
            <a key={l.href} href={l.href} className="transition-colors hover:text-foreground">
              {l.label}
            </a>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button asChild variant="ghost" size="sm" className="hidden sm:inline-flex">
            <Link href="/login">Connexion</Link>
          </Button>
          <Button asChild variant="accent" size="sm" className="hidden sm:inline-flex">
            <Link href="/register">Commencer gratuitement</Link>
          </Button>

          <button
            type="button"
            onClick={() => setOpen((v) => !v)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
            className="inline-flex size-11 items-center justify-center rounded-lg text-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring lg:hidden"
          >
            {open ? <X className="size-5" /> : <Menu className="size-5" />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {open ? (
          <motion.div
            id="mobile-menu"
            initial={reduced ? false : { opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={reduced ? undefined : { opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="mx-auto mt-2 max-w-6xl rounded-2xl border border-border bg-surface p-4 shadow-lg lg:hidden"
          >
            <div className="flex flex-col">
              {LINKS.map((l) => (
                <a
                  key={l.href}
                  href={l.href}
                  onClick={() => setOpen(false)}
                  className="rounded-lg px-3 py-3 text-sm font-medium text-foreground hover:bg-muted"
                >
                  {l.label}
                </a>
              ))}
              <div className="mt-2 flex flex-col gap-2 border-t border-border pt-3">
                <Button asChild variant="outline">
                  <Link href="/login">Connexion</Link>
                </Button>
                <Button asChild variant="accent">
                  <Link href="/register">Commencer gratuitement</Link>
                </Button>
              </div>
            </div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </motion.header>
  );
}
