"use client";

import { useState } from "react";
import { Copy, Check } from "lucide-react";
import { Button } from "./button";

/** Bouton de copie dans le presse-papiers, avec retour visuel bref. */
export function CopyButton({
  value,
  label = "Copier",
  copiedLabel = "Copié",
  variant = "outline",
  className,
}: {
  value: string;
  label?: string;
  copiedLabel?: string;
  variant?: "outline" | "ghost" | "secondary";
  className?: string;
}) {
  const [copied, setCopied] = useState(false);

  async function copy() {
    try {
      await navigator.clipboard.writeText(value);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // Presse-papiers indisponible (contexte non sécurisé) : on ignore.
    }
  }

  return (
    <Button type="button" variant={variant} size="sm" onClick={copy} className={className}>
      {copied ? <Check className="size-4 text-success" /> : <Copy className="size-4" />}
      {copied ? copiedLabel : label}
    </Button>
  );
}
