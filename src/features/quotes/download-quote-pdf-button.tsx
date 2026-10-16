"use client";

import { useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/components/ui/toast";

export function DownloadQuotePdfButton({ quoteId, number }: { quoteId: string; number: string }) {
  const [pending, setPending] = useState(false);
  const { toast } = useToast();

  async function download() {
    setPending(true);
    try {
      const response = await fetch(`/api/devis/${quoteId}/pdf`, {
        credentials: "same-origin",
        cache: "no-store",
      });
      if (!response.ok || !response.headers.get("content-type")?.includes("application/pdf")) {
        const payload = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(payload?.error ?? "Le serveur n’a pas produit un fichier PDF valide.");
      }

      const href = URL.createObjectURL(await response.blob());
      const anchor = document.createElement("a");
      anchor.href = href;
      anchor.download = `${number}.pdf`;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(href);
      toast({ title: "PDF téléchargé", description: `${number}.pdf`, variant: "success" });
    } catch (error) {
      toast({
        title: "Téléchargement impossible",
        description: error instanceof Error ? error.message : "Réessayez dans quelques instants.",
        variant: "danger",
      });
    } finally {
      setPending(false);
    }
  }

  return (
    <Button type="button" size="sm" variant="outline" onClick={download} disabled={pending}>
      {pending ? (
        <Loader2 className="size-4 animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-4" aria-hidden="true" />
      )}
      PDF
    </Button>
  );
}
