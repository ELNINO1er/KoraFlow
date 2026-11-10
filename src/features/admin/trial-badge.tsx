import { Badge } from "@/components/ui/badge";
import { trialState } from "@/lib/billing/trial";

/** Badge d'état d'essai (console /admin). `now` permet un rendu déterministe. */
export function TrialBadge({ trialEndsAt, now }: { trialEndsAt: Date | null; now: Date }) {
  const state = trialState(trialEndsAt, { now });
  if (state.kind === "none") return <Badge variant="outline">sans limite</Badge>;
  if (state.kind === "expired") return <Badge variant="danger">essai expiré</Badge>;
  return (
    <Badge variant={state.daysLeft <= 3 ? "warning" : "default"}>
      essai · {state.daysLeft} j
    </Badge>
  );
}
