"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { resolveSession, type AuthContext } from "@/server/auth/context";
import * as contractService from "@/server/services/contract-service";
import { ContractError } from "@/server/services/contract-service";
import { PermissionError } from "@/server/permissions/permissions";
import { generateContractPdf } from "@/server/services/contract-pdf";
import { sendEmail, emailDeliveryErrorMessage } from "@/server/integrations/email/mailer";
import { brandedEmail } from "@/server/integrations/email/template";
import { z } from "zod";

const updateContractSchema = z.object({
  title: z.string().trim().min(3).max(160),
  content: z.string().trim().min(40).max(30_000),
});

async function getContext(): Promise<AuthContext> {
  const session = await resolveSession();
  if (session.status === "unauthenticated") redirect("/login");
  if (session.status === "suspended") redirect("/compte-suspendu");
  if (session.status === "no-organization") redirect("/create-organization");
  return session.context;
}

export async function generateContractAction(
  quoteId: string,
): Promise<{ ok: boolean; contractId?: string; error?: string }> {
  const ctx = await getContext();
  try {
    const contract = await contractService.generateFromQuote(ctx, quoteId);
    revalidatePath("/contrats");
    return { ok: true, contractId: contract.id };
  } catch (e) {
    if (e instanceof ContractError) return { ok: false, error: e.message };
    if (e instanceof PermissionError)
      return { ok: false, error: "Permission insuffisante." };
    throw e;
  }
}

export async function updateContractAction(
  id: string,
  input: z.input<typeof updateContractSchema>,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const parsed = updateContractSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Le titre et le contenu du contrat sont incomplets." };
  }
  try {
    await contractService.updateDraftContract(ctx, id, parsed.data);
  } catch (error) {
    if (error instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (error instanceof ContractError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/contrats/${id}`);
  revalidatePath(`/contrats/${id}/modifier`);
  revalidatePath("/contrats");
  return { ok: true };
}

export async function reopenContractAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  try {
    await contractService.reopenContractForCorrection(ctx, id);
  } catch (error) {
    if (error instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (error instanceof ContractError) return { ok: false, error: error.message };
    throw error;
  }
  revalidatePath(`/contrats/${id}`);
  revalidatePath("/contrats");
  return { ok: true };
}

export async function sendContractAction(
  id: string,
): Promise<{ ok: boolean; error?: string }> {
  const ctx = await getContext();
  const contract = await contractService.getContract(ctx, id);
  if (!contract) return { ok: false, error: "Contrat introuvable." };
  if (contract.status !== "DRAFT" && contract.status !== "SENT") {
    return { ok: false, error: "Ce contrat ne peut plus être envoyé pour signature." };
  }

  let pdf: Awaited<ReturnType<typeof generateContractPdf>>;
  try {
    pdf = await generateContractPdf(ctx, id);
  } catch (error) {
    console.error("contract.pdf_generation_failed", {
      contractId: id,
      error: error instanceof Error ? error.message : "unknown",
    });
    return { ok: false, error: "Le PDF du contrat n’a pas pu être généré." };
  }
  if (!pdf) return { ok: false, error: "Le PDF du contrat n’a pas pu être généré." };
  if (!pdf.contactEmail) return { ok: false, error: "Le client n’a pas d’adresse e-mail." };
  if (!pdf.publicToken) return { ok: false, error: "Le lien sécurisé du contrat est indisponible." };

  const appUrl = process.env.APP_URL?.replace(/\/$/, "");
  if (!appUrl) return { ok: false, error: "L’adresse publique de l’application n’est pas configurée." };
  const signUrl = `${appUrl}/c/${pdf.publicToken}`;

  try {
    await sendEmail({
      to: pdf.contactEmail,
      subject: `Contrat ${pdf.number} à consulter et signer`,
      html: brandedEmail({
        title: "Votre contrat est prêt à être signé",
        intro: `Bonjour ${contract.contact.firstName},`,
        body: `Le contrat ${pdf.number} préparé par ${pdf.organizationName} est disponible. Consultez attentivement le document joint, puis utilisez le lien sécurisé pour donner votre consentement et le signer.`,
        action: { label: "Consulter et signer le contrat", url: signUrl },
        brandName: pdf.organizationName,
        logoUrl: pdf.organizationLogoUrl,
        footer: `Ce message concerne le contrat ${pdf.number}. La signature proposée est une signature électronique simple.`,
      }),
      text: `Votre contrat ${pdf.number} est joint à cet e-mail. Pour le consulter et le signer : ${signUrl}`,
      attachments: [{ filename: pdf.filename, content: pdf.buffer, contentType: "application/pdf" }],
      replyTo: pdf.organizationEmail ?? undefined,
    });
    await contractService.changeContractStatus(ctx, id, "SENT");
  } catch (e) {
    if (e instanceof PermissionError) return { ok: false, error: "Permission insuffisante." };
    if (e instanceof ContractError) return { ok: false, error: e.message };
    return { ok: false, error: emailDeliveryErrorMessage(e) };
  }
  revalidatePath(`/contrats/${id}`);
  revalidatePath("/contrats");
  return { ok: true };
}

export async function deleteContractAction(id: string) {
  const ctx = await getContext();
  try {
    await contractService.deleteContract(ctx, id);
  } catch (e) {
    if (e instanceof PermissionError) return;
    throw e;
  }
  revalidatePath("/contrats");
  redirect("/contrats");
}
