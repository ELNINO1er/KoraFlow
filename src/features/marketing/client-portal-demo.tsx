"use client";

import { useState } from "react";
import { motion } from "motion/react";
import { Check, FileText, PenLine, Smartphone, FolderKanban, Download, ArrowLeftRight } from "lucide-react";
import { Reveal, SectionHeading } from "./reveal";
import { useMotionPref } from "./motion-preferences";

const PORTAL_ITEMS = [
  { icon: FileText, label: "Consulter un devis", action: "Accepter / Refuser" },
  { icon: PenLine, label: "Signer un contrat", action: "Signature en ligne" },
  { icon: Smartphone, label: "Déclarer un paiement", action: "Avec référence" },
  { icon: FolderKanban, label: "Suivre un projet", action: "Avancement en direct" },
  { icon: Download, label: "Télécharger ses documents", action: "PDF" },
];

export function ClientPortalDemo() {
  const { reduced } = useMotionPref();
  const [portal, setPortal] = useState(false);

  return (
    <section className="border-y border-border bg-surface/50">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2 lg:px-8">
        <Reveal variant="right">
          <div>
            <SectionHeading
              align="left"
              kicker="Portail client"
              title="Vos clients suivent tout, sans créer de compte"
              subtitle="D'un côté votre espace d'administration, de l'autre le portail que voit votre client. Un même dossier, deux perspectives."
            />
            <button
              type="button"
              onClick={() => setPortal((v) => !v)}
              aria-pressed={portal}
              className="mt-6 inline-flex h-11 items-center gap-2 rounded-lg border border-border bg-surface px-4 text-sm font-medium text-foreground shadow-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <ArrowLeftRight className="size-4 text-accent" />
              {portal ? "Voir la vue admin" : "Voir le portail client"}
            </button>
          </div>
        </Reveal>

        <Reveal variant="left" amount={0.2}>
          <div className="[perspective:1400px]">
            <motion.div
              className="relative min-h-[20rem] [transform-style:preserve-3d]"
              animate={{ rotateY: portal ? 180 : 0 }}
              transition={{ duration: reduced ? 0 : 0.8, ease: [0.65, 0, 0.35, 1] }}
            >
              {/* Face admin */}
              <div className="[backface-visibility:hidden]">
                <AdminFace />
              </div>
              {/* Face portail */}
              <div className="absolute inset-0 [backface-visibility:hidden] [transform:rotateY(180deg)]">
                <PortalFace />
              </div>
            </motion.div>
          </div>
        </Reveal>
      </div>
    </section>
  );
}

function AdminFace() {
  return (
    <div className="rounded-2xl border border-border bg-surface p-5 shadow-xl">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Espace admin</p>
      <p className="mt-1 font-display text-base font-semibold text-foreground">Fiche client — Baobab SARL</p>
      <div className="mt-4 space-y-2">
        {["Devis DEV-0142 · envoyé", "Contrat CTR-0031 · en attente", "Facture FAC-0098 · à valider"].map((r) => (
          <div key={r} className="flex items-center justify-between rounded-lg bg-muted px-3 py-2 text-xs text-foreground">
            {r}
            <span className="size-1.5 rounded-full bg-accent" />
          </div>
        ))}
      </div>
      <p className="mt-4 text-[11px] text-muted-foreground">Vous préparez, envoyez, validez.</p>
    </div>
  );
}

function PortalFace() {
  return (
    <div className="rounded-2xl border border-accent/30 bg-surface p-5 shadow-xl">
      <p className="text-xs font-medium uppercase tracking-wide text-accent">Portail client</p>
      <p className="mt-1 font-display text-base font-semibold text-foreground">Espace de Baobab SARL</p>
      <ul className="mt-4 space-y-2">
        {PORTAL_ITEMS.map((it) => {
          const Icon = it.icon;
          return (
            <li key={it.label} className="flex items-center gap-3 rounded-lg bg-muted px-3 py-2">
              <span className="flex size-7 items-center justify-center rounded-lg bg-accent/10 text-accent">
                <Icon className="size-4" />
              </span>
              <span className="flex-1 text-xs font-medium text-foreground">{it.label}</span>
              <span className="text-[10px] text-muted-foreground">{it.action}</span>
            </li>
          );
        })}
      </ul>
      <p className="mt-3 flex items-center gap-1.5 text-[11px] text-success">
        <Check className="size-3.5" /> Accès par lien sécurisé, sans mot de passe
      </p>
    </div>
  );
}
