import "server-only";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { auth } from "./auth";
import { prisma } from "../database/client";

/**
 * Administration de PLATEFORME (super admin transverse aux organisations).
 *
 * Ce périmètre franchit délibérément l'isolation multi-tenant : il ne doit donc
 * JAMAIS être atteignable depuis l'espace d'une organisation. Le drapeau
 * `isPlatformAdmin` n'est pas assignable via l'UI d'une organisation ; il
 * s'accorde hors interface (script `admin:grant`) ou depuis la console /admin
 * par un admin plateforme déjà en place.
 */
export interface PlatformAdmin {
  id: string;
  email: string;
  name: string | null;
}

/**
 * Renvoie l'admin plateforme courant, ou `null` (non connecté, non admin, ou
 * compte suspendu). Utilisé pour l'affichage conditionnel (ex. lien « Admin »).
 */
export async function resolvePlatformAdmin(): Promise<PlatformAdmin | null> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) return null;

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      id: true,
      email: true,
      name: true,
      isPlatformAdmin: true,
      suspendedAt: true,
    },
  });

  if (!user || !user.isPlatformAdmin || user.suspendedAt) return null;
  return { id: user.id, email: user.email, name: user.name };
}

/**
 * Garde stricte pour les pages/actions de la console /admin.
 * - Non connecté → redirige vers /login.
 * - Connecté mais NON admin plateforme (ou suspendu) → 404 : on ne révèle pas
 *   l'existence de la console à un utilisateur ordinaire.
 */
export async function requirePlatformAdmin(): Promise<PlatformAdmin> {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session?.user) redirect("/login");

  const admin = await resolvePlatformAdmin();
  if (!admin) notFound();
  return admin;
}
