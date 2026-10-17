import { auth } from "@/server/auth/auth";
import { toNextJsHandler } from "better-auth/next-js";

/**
 * Point d'entrée HTTP de Better Auth.
 * Toutes les routes d'authentification (/api/auth/*) sont déléguées à l'instance
 * serveur : inscription, connexion, déconnexion, vérification e-mail, reset,
 * sessions, 2FA.
 */
const handlers = toNextJsHandler(auth);

async function handle(request: Request) {
  // All platform operations go through our guarded, audited Server Actions.
  // Blocking the entire HTTP namespace also covers future plugin endpoints.
  let path: string;
  try { path = decodeURIComponent(new URL(request.url).pathname).replace(/\/+/g, "/").replace(/\/+$/, ""); }
  catch { return new Response(null, { status: 400 }); }
  if (path === "/api/auth/admin" || path.startsWith("/api/auth/admin/")) {
    return new Response(null, { status: 404 });
  }
  return request.method === "GET" ? handlers.GET(request) : handlers.POST(request);
}

export const GET = handle;
export const POST = handle;
