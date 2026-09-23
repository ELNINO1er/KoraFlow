import { NextRequest, NextResponse } from "next/server";

/**
 * Content-Security-Policy avec nonce par requête (§10).
 * Next.js applique automatiquement le nonce à ses scripts en lisant la CSP dans
 * l'en-tête de requête. `strict-dynamic` limite l'exécution aux scripts chargés
 * par un script noncé. `style-src 'unsafe-inline'` reste nécessaire (styles
 * inline de Recharts / composants) ; les styles sont à faible risque XSS.
 */
export function middleware(request: NextRequest) {
  const isDev = process.env.NODE_ENV !== "production";
  const nonce = btoa(crypto.randomUUID());

  const csp = [
    `default-src 'self'`,
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic'${isDev ? " 'unsafe-eval'" : ""}`,
    `style-src 'self' 'unsafe-inline'`,
    `img-src 'self' data: blob:`,
    `font-src 'self' data:`,
    `connect-src 'self'${isDev ? " ws:" : ""}`,
    `frame-ancestors 'self'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `object-src 'none'`,
    ...(isDev ? [] : ["upgrade-insecure-requests"]),
  ].join("; ");

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set("x-nonce", nonce);
  requestHeaders.set("content-security-policy", csp);

  const response = NextResponse.next({ request: { headers: requestHeaders } });
  response.headers.set("content-security-policy", csp);
  return response;
}

export const config = {
  matcher: [
    // Toutes les routes sauf les assets statiques et le PDF binaire.
    {
      source:
        "/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico|woff2?)$).*)",
      missing: [{ type: "header", key: "next-router-prefetch" }],
    },
  ],
};
