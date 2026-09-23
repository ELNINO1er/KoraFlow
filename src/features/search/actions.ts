"use server";

import { resolveSession } from "@/server/auth/context";
import { prisma } from "@/server/database/client";

export interface SearchHit {
  id: string;
  label: string;
  sub?: string;
  href: string;
}

export interface SearchResults {
  contacts: SearchHit[];
  quotes: SearchHit[];
  invoices: SearchHit[];
}

const EMPTY: SearchResults = { contacts: [], quotes: [], invoices: [] };

/** Recherche globale scopée à l'organisation (contacts, devis, factures). */
export async function searchAllAction(query: string): Promise<SearchResults> {
  const session = await resolveSession();
  if (session.status !== "ok") return EMPTY;
  const q = query.trim();
  if (q.length < 2) return EMPTY;

  const organizationId = session.context.organizationId;
  const insensitive = { contains: q, mode: "insensitive" as const };

  const [contacts, quotes, invoices] = await Promise.all([
    prisma.contact.findMany({
      where: {
        organizationId,
        deletedAt: null,
        OR: [
          { firstName: insensitive },
          { lastName: insensitive },
          { email: insensitive },
          { companyName: insensitive },
        ],
      },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, firstName: true, lastName: true, companyName: true },
    }),
    prisma.quote.findMany({
      where: { organizationId, deletedAt: null, number: insensitive },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true },
    }),
    prisma.invoice.findMany({
      where: { organizationId, deletedAt: null, number: insensitive },
      take: 5,
      orderBy: { createdAt: "desc" },
      select: { id: true, number: true },
    }),
  ]);

  return {
    contacts: contacts.map((c) => ({
      id: c.id,
      label: `${c.firstName} ${c.lastName ?? ""}`.trim(),
      sub: c.companyName ?? undefined,
      href: `/clients/${c.id}`,
    })),
    quotes: quotes.map((qte) => ({ id: qte.id, label: qte.number, href: `/devis/${qte.id}` })),
    invoices: invoices.map((inv) => ({ id: inv.id, label: inv.number, href: `/factures/${inv.id}` })),
  };
}
