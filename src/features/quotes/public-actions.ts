"use server";

import { revalidatePath } from "next/cache";
import { headers } from "next/headers";
import { z } from "zod";
import { prisma } from "@/server/database/client";
import { guardPublicMutation } from "@/lib/security/public-mutation";
import {
  expireQuoteByTokenIfNeeded,
  getQuoteByPublicToken,
  respondToQuoteByToken,
} from "@/server/repositories/quote-repository";
import { notifyOrg } from "@/server/services/notification-service";
import { generateQuotePdfByToken } from "@/server/services/quote-pdf";
import { archiveDocument, snapshotFingerprint } from "@/server/services/document-archive-service";

/**
 * Réponse du client à un devis via son jeton public (aucune authentification).
 * Le jeton est le secret d'accès. N'agit que sur un devis encore en attente.
 */
export async function respondToQuoteAction(
  token: string,
  decision: "ACCEPTED" | "REJECTED",
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({
    token: z.string(),
    decision: z.enum(["ACCEPTED", "REJECTED"]),
  }).safeParse({ token, decision });
  if (!parsed.success) return { ok: false, error: "Réponse invalide." };

  const guard = guardPublicMutation({
    scope: "quote-response",
    token: parsed.data.token,
    headers: await headers(),
  });
  if (!guard.ok) return guard;

  const quote = await getQuoteByPublicToken(parsed.data.token);
  if (!quote) return { ok: false, error: "Devis introuvable ou expiré." };

  // Vérification serveur de la validité à l'acceptation : un devis dont la date
  // de validité est passée ne peut plus être accepté.
  if (
    parsed.data.decision === "ACCEPTED" &&
    quote.expiryDate &&
    quote.expiryDate.getTime() < Date.now()
  ) {
    await expireQuoteByTokenIfNeeded(parsed.data.token);
    revalidatePath(`/q/${parsed.data.token}`);
    return {
      ok: false,
      error: "Ce devis a expiré et ne peut plus être accepté. Contactez l’émetteur pour le renouveler.",
    };
  }

  const changed = await respondToQuoteByToken(parsed.data.token, parsed.data.decision);
  if (!changed) {
    return {
      ok: false,
      error: "Ce devis ne peut plus être modifié (déjà traité).",
    };
  }

  await prisma.auditLog.create({
    data: {
      organizationId: quote.organizationId,
      action: parsed.data.decision === "ACCEPTED" ? "quote.accepted_by_client" : "quote.rejected_by_client",
      targetType: "Quote",
      targetId: quote.id,
      metadata: { via: "public_portal" },
    },
  });

  await notifyOrg(
    quote.organizationId,
    {
      type: parsed.data.decision === "ACCEPTED" ? "quote.accepted" : "quote.rejected",
      title: parsed.data.decision === "ACCEPTED" ? `Devis ${quote.number} accepté` : `Devis ${quote.number} refusé`,
      link: `/devis/${quote.id}`,
    },
    { email: true },
  );

  // Conservation : à l'ACCEPTATION, on archive le PDF du devis (version de
  // référence figée). Non bloquant ; un échec laisse l'archive en FAILED.
  if (parsed.data.decision === "ACCEPTED") {
    try {
      const pdf = await generateQuotePdfByToken(parsed.data.token);
      if (pdf) {
        const snapshot = {
          number: quote.number,
          clientName: quote.contact.companyName || `${quote.contact.firstName} ${quote.contact.lastName ?? ""}`.trim(),
          currency: quote.currency,
          subtotalMinor: quote.subtotalMinor,
          discountMinor: quote.discountMinor,
          taxMinor: quote.taxMinor,
          totalMinor: quote.totalMinor,
          depositMinor: quote.depositMinor,
          terms: quote.terms ?? null,
        };
        await archiveDocument({
          organizationId: quote.organizationId,
          documentType: "QUOTE",
          documentId: quote.id,
          reason: "ACCEPTED",
          contentHash: snapshotFingerprint(snapshot),
          snapshot,
          pdf: pdf.buffer,
        });
      }
    } catch (error) {
      console.warn("quote.archive_failed", { error: error instanceof Error ? error.message : "unknown" });
    }
  }

  revalidatePath(`/q/${parsed.data.token}`);
  return { ok: true };
}
