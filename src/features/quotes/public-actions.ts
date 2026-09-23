"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/server/database/client";
import {
  getQuoteByPublicToken,
  respondToQuoteByToken,
} from "@/server/repositories/quote-repository";
import { notifyOrg } from "@/server/services/notification-service";

/**
 * Réponse du client à un devis via son jeton public (aucune authentification).
 * Le jeton est le secret d'accès. N'agit que sur un devis encore en attente.
 */
export async function respondToQuoteAction(
  token: string,
  decision: "ACCEPTED" | "REJECTED",
): Promise<{ ok: boolean; error?: string }> {
  const quote = await getQuoteByPublicToken(token);
  if (!quote) return { ok: false, error: "Devis introuvable ou expiré." };

  const changed = await respondToQuoteByToken(token, decision);
  if (!changed) {
    return {
      ok: false,
      error: "Ce devis ne peut plus être modifié (déjà traité).",
    };
  }

  await prisma.auditLog.create({
    data: {
      organizationId: quote.organizationId,
      action: decision === "ACCEPTED" ? "quote.accepted_by_client" : "quote.rejected_by_client",
      targetType: "Quote",
      targetId: quote.id,
      metadata: { via: "public_portal" },
    },
  });

  await notifyOrg(
    quote.organizationId,
    {
      type: decision === "ACCEPTED" ? "quote.accepted" : "quote.rejected",
      title: decision === "ACCEPTED" ? `Devis ${quote.number} accepté` : `Devis ${quote.number} refusé`,
      link: `/devis/${quote.id}`,
    },
    { email: true },
  );

  revalidatePath(`/q/${token}`);
  return { ok: true };
}
