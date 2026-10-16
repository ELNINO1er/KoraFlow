import "server-only";
import type { AuthContext } from "../auth/context";
import { prisma } from "../database/client";
import { getPrivateFile } from "../storage/private-storage";
import { organizationLogoContentType } from "@/lib/organizations/logo-validation";
import { renderContractPdf } from "../pdf/render-contract";
import * as contracts from "../repositories/contract-repository";
import { getContract } from "./contract-service";

async function logoDataUri(storageKey: string | null | undefined) {
  if (!storageKey?.startsWith("organization-logos/")) return null;
  try {
    const bytes = await getPrivateFile(storageKey);
    return `data:${organizationLogoContentType(storageKey)};base64,${bytes.toString("base64")}`;
  } catch {
    return null;
  }
}

function clientName(contact: { firstName: string; lastName: string | null; companyName: string | null }) {
  return contact.companyName || `${contact.firstName} ${contact.lastName ?? ""}`.trim();
}

export async function generateContractPdf(ctx: AuthContext, id: string) {
  const contract = await getContract(ctx, id);
  if (!contract) return null;
  const organization = await prisma.organization.findUnique({
    where: { id: ctx.organizationId },
    select: { name: true, email: true, logoUrl: true },
  });
  const locale = ctx.organization.locale === "fr" ? "fr-FR" : ctx.organization.locale;
  const buffer = await renderContractPdf({
    number: contract.number,
    title: contract.title,
    content: contract.content,
    organization: {
      name: organization?.name ?? ctx.organization.name,
      logoDataUri: await logoDataUri(organization?.logoUrl),
    },
    clientName: clientName(contract.contact),
    createdAt: contract.createdAt,
    signedAt: contract.signedAt,
    signerName: contract.signerName,
    signerEmail: contract.signerEmail,
    contentHash: contract.contentHash,
    locale,
  });
  return {
    buffer,
    filename: `${contract.number}${contract.signedAt ? "-signe" : ""}.pdf`,
    number: contract.number,
    contactEmail: contract.contact.email,
    publicToken: contract.publicToken,
    organizationName: organization?.name ?? ctx.organization.name,
    organizationEmail: organization?.email ?? null,
    organizationLogoUrl: organization?.logoUrl ? `${process.env.APP_URL ?? ""}/api/organization-logos/${ctx.organizationId}` : null,
  };
}

export async function generateContractPdfByToken(token: string) {
  const contract = await contracts.getContractByToken(token);
  if (!contract) return null;
  const locale = contract.organization.locale === "fr" ? "fr-FR" : contract.organization.locale;
  const buffer = await renderContractPdf({
    number: contract.number,
    title: contract.title,
    content: contract.content,
    organization: {
      name: contract.organization.name,
      logoDataUri: await logoDataUri(contract.organization.logoUrl),
    },
    clientName: clientName(contract.contact),
    createdAt: contract.createdAt,
    signedAt: contract.signedAt,
    signerName: contract.signerName,
    signerEmail: contract.signerEmail,
    contentHash: contract.contentHash,
    locale,
  });
  return {
    buffer,
    filename: `${contract.number}${contract.signedAt ? "-signe" : ""}.pdf`,
    number: contract.number,
    contactEmail: contract.contact.email,
    publicToken: token,
    organizationName: contract.organization.name,
    organizationEmail: null,
    organizationLogoUrl: contract.organization.logoUrl ? `${process.env.APP_URL ?? ""}/api/organization-logos/${contract.organization.id}` : null,
  };
}
