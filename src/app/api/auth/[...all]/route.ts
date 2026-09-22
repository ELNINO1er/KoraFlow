import { auth } from "@/server/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Point d'entrée HTTP de Better Auth.
 * Toutes les routes d'authentification (/api/auth/*) sont déléguées à l'instance
 * serveur : inscription, connexion, déconnexion, vérification e-mail, reset,
 * sessions, 2FA.
 */
export const { POST, GET } = toNextJsHandler(auth);
