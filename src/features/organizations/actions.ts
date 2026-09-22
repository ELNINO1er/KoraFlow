"use server";

import { cookies, headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/server/auth/auth";
import { prisma } from "@/server/database/client";
import { createOrganization } from "@/server/services/organization-service";
import { ACTIVE_ORG_COOKIE } from "@/lib/constants/cookies";

const activeOrgCookieOptions = {
  httpOnly: true,
  sameSite: "lax" as const,
  path: "/",
  secure: process.env.NODE_ENV === "production",
  maxAge: 60 * 60 * 24 * 365,
};

/** Change l'organisation active (après revérification de l'appartenance en base). */
export async function setActiveOrganization(organizationId: string) {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return;

  const membership = await prisma.membership.findUnique({
    where: {
      userId_organizationId: { userId: session.user.id, organizationId },
    },
    select: { id: true },
  });
  if (!membership) return; // pas d'accès inter-organisation

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organizationId, activeOrgCookieOptions);
  revalidatePath("/", "layout");
}

export interface CreateOrgState {
  error: string | null;
}

/** Crée l'organisation du nouvel utilisateur puis le redirige vers le tableau de bord. */
export async function createOrganizationAction(
  _prevState: CreateOrgState,
  formData: FormData,
): Promise<CreateOrgState> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const name = String(formData.get("name") ?? "").trim();
  if (name.length < 2) {
    return { error: "Le nom de l'entreprise doit comporter au moins 2 caractères." };
  }

  const organization = await createOrganization({
    userId: session.user.id,
    name,
  });

  const store = await cookies();
  store.set(ACTIVE_ORG_COOKIE, organization.id, activeOrgCookieOptions);

  redirect("/dashboard");
}
