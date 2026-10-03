import { createHash } from "node:crypto";
import { rateLimit } from "./rate-limit";

const PUBLIC_TOKEN_PATTERN = /^[a-f0-9]{48}$/;

export function isValidPublicDocumentToken(token: string): boolean {
  return PUBLIC_TOKEN_PATTERN.test(token);
}

function clientAddress(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || request.headers.get("x-real-ip")?.trim() || "unknown";
}

/**
 * Limite le coût de génération des PDF publics. La clé est hachée pour ne pas
 * conserver une adresse IP brute dans la mémoire du processus.
 */
export function limitPublicDocumentRequest(request: Request): Response | null {
  const key = createHash("sha256").update(clientAddress(request)).digest("hex");
  const result = rateLimit(`public-pdf:${key}`, 30, 60_000);
  if (result.ok) return null;

  const retryAfterSeconds = Math.max(1, Math.ceil((result.retryAfterMs ?? 1000) / 1000));
  return new Response("Trop de demandes. Réessayez plus tard.", {
    status: 429,
    headers: {
      "Retry-After": String(retryAfterSeconds),
      "Cache-Control": "no-store",
    },
  });
}
