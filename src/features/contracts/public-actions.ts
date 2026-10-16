"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { guardPublicMutation } from "@/lib/security/public-mutation";
import { signContractByToken } from "@/server/services/contract-service";
import { generateContractPdfByToken } from "@/server/services/contract-pdf";
import { sendEmail } from "@/server/integrations/email/mailer";
import { brandedEmail } from "@/server/integrations/email/template";

/**
 * Signature du contrat par le client via son jeton public (aucune auth).
 * Capture l'IP et le user-agent depuis la requête pour la piste d'audit.
 */
export async function signContractAction(
  token: string,
  signerName: string,
): Promise<{ ok: boolean; error?: string }> {
  const parsed = z.object({
    token: z.string(),
    signerName: z.string().trim().min(2).max(120),
  }).safeParse({ token, signerName });
  if (!parsed.success) return { ok: false, error: "Informations de signature invalides." };

  const guard = guardPublicMutation({
    scope: "contract-signature",
    token: parsed.data.token,
    headers: await headers(),
  });
  if (!guard.ok) return guard;

  const result = await signContractByToken(parsed.data.token, {
    signerName: parsed.data.signerName,
    ipAddress: guard.ipAddress,
    userAgent: guard.userAgent,
  });

  if (!result.ok) return { ok: false, error: result.error };
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
