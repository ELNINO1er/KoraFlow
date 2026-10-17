"use client";

import { useState } from "react";
import { Ban, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { suspendOrgAction } from "./actions";
import { SensitiveActionDialog } from "./sensitive-action-dialog";

export function OrgSuspendToggle({ orgId, name, suspended }: { orgId: string; name: string; suspended: boolean }) {
  const [open, setOpen] = useState(false);
  return <>
    <Button type="button" size="sm" variant={suspended ? "outline" : "ghost"} className={suspended ? "" : "text-danger hover:bg-danger/10"} onClick={() => setOpen(true)}>
      {suspended ? <RotateCcw className="size-4" /> : <Ban className="size-4" />}{suspended ? "Réactiver" : "Suspendre"}
    </Button>
    {open ? <SensitiveActionDialog title={suspended ? "Réactiver l’organisation" : "Suspendre l’organisation"} target={name}
      description={suspended ? "Les membres pourront à nouveau accéder à cette organisation." : "Tous les membres perdront l’accès à cette organisation jusqu’à sa réactivation."}
      onClose={() => setOpen(false)} onConfirm={(confirmation) => suspendOrgAction(orgId, !suspended, confirmation)} /> : null}
  </>;
}
