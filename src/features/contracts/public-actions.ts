"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardPublicMutation } from "@/lib/security/public-mutation";
import { signContractByToken } from "@/server/services/contract-service";
import { generateContractPdfByToken } from "@/server/services/contract-pdf";
import { getContractByToken } from "@/server/repositories/contract-repository";
import { archiveDocument } from "@/server/services/document-archive-service";
import { sendEmail } from "@/server/integrations/email/mailer";
import { brandedEmail } from "@/server/integrations/email/template";

/**
 * Signature du contrat par le client via son jeton public (aucune auth).
 * Capture l'IP et le user-agent depuis la requête pour la piste d'audit.
 */
export async function signContractAction(
  token: string,
  signerName: string,
  consent: boolean,
  expectedContentHash: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({
    token: z.string(),
    signerName: z.string().trim().min(2).max(120),
    consent: z.literal(true, { message: "Consentement requis." }),
    expectedContentHash: z.string().regex(/^[a-f0-9]{64}$/, "Empreinte invalide."),
  }).safeParse({ token, signerName, consent, expectedContentHash });
  if (!parsed.success) return { ok: false, error: "Informations de signature invalides." };

  const guard = guardPublicMutation({
    scope: "contract-signature",
    token: parsed.data.token,
    headers: await headers(),
  });
  if (!guard.ok) return guard;

  const result = await signContractByToken(parsed.data.token, {
    signerName: parsed.data.signerName,
    consent: parsed.data.consent,
    expectedContentHash: parsed.data.expectedContentHash,
    ipAddress: guard.ipAddress,
    userAgent: guard.userAgent,
  });

  if (!result.ok) return { ok: false, error: result.error };

  // Archivage du PDF signé = version de référence conservée dans le stockage
  // privé (write-once + empreinte). Non bloquant : un échec laisse l'archive en
  // FAILED (reprise possible) sans invalider la signature déjà enregistrée.
  try {
    const pdf = await generateContractPdfByToken(parsed.data.token);
    const contract = await getContractByToken(parsed.data.token);
    if (pdf && contract) {
      await archiveDocument({
        organizationId: contract.organizationId,
        documentType: "CONTRACT",
        documentId: contract.id,
        reason: "SIGNED",
        contentHash: contract.contentHash,
        pdf: pdf.buffer,
        snapshot: {
          number: contract.number,
          title: contract.title,
          content: contract.content,
          organizationName: contract.organization.name,
          clientName: contract.contact.companyName
            || `${contract.contact.firstName} ${contract.contact.lastName ?? ""}`.trim(),
          clientEmail: contract.contact.email,
          signerName: contract.signerName,
          signedAt: contract.signedAt?.toISOString() ?? null,
          contentHash: contract.contentHash,
        },
      });
    }
  } catch (error) {
    console.warn("contract.archive_failed", {
      token: parsed.data.token.slice(0, 8),
      error: error instanceof Error ? error.message : "unknown",
    });
  }

  try {
    const pdf = await generateContractPdfByToken(parsed.data.token);
    if (pdf?.contactEmail) {
      await sendEmail({
        to: pdf.contactEmail,
        subject: `Confirmation de signature — ${pdf.number}`,
        html: brandedEmail({
          title: "Votre contrat a été signé",
          body: `La signature du contrat ${pdf.number} a bien été enregistrée. Le document signé et son certificat de signature simple sont joints à cet e-mail.`,
          brandName: pdf.organizationName,
          logoUrl: pdf.organizationLogoUrl,
        }),
        text: `La signature du contrat ${pdf.number} a bien été enregistrée. Le document signé est joint à cet e-mail.`,
        attachments: [{ filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" }],
      });
    }
  } catch (error) {
    console.warn("contract.signed_confirmation_email_failed", {
      contractId: result.contractId,
      error: error instanceof Error ? error.message : "unknown",
    });
  }
  revalidatePath(`/c/${parsed.data.token}`);
  return { ok: true };
}
