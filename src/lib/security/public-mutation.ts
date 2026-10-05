import { createHash } from "node:crypto";
import { isValidPublicDocumentToken } from "./public-document-access";
import { rateLimit } from "./rate-limit";

interface PublicMutationInput {
  scope: "quote-response" | "contract-signature";
  token: string;
  headers: Headers;
  limit?: number;
  windowMs?: number;
}

export type PublicMutationGuard =
  | { ok: true; ipAddress?: string; userAgent?: string }
  | { ok: false; error: string };

/**
 * Valide le jeton et limite les mutations publiques coûteuses ou irréversibles.
 * La clé mémoire est hachée afin de ne conserver ni IP brute ni jeton secret.
 * Le reverse proxy de production doit remplacer (et non concaténer depuis le
 * client) les en-têtes `x-forwarded-for` / `x-real-ip`.
 */
export function guardPublicMutation(input: PublicMutationInput): PublicMutationGuard {
  if (!isValidPublicDocumentToken(input.token)) {
    return { ok: false, error: "Lien invalide ou expiré." };
  }

  const forwarded = input.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const realIp = input.headers.get("x-real-ip")?.trim();
  const ipAddress = forwarded || realIp || undefined;
  const key = createHash("sha256")
    .update(`${input.scope}:${ipAddress ?? "unknown"}:${input.token}`)
    .digest("hex");
  const result = rateLimit(
    `public-mutation:${key}`,
    input.limit ?? 5,
    input.windowMs ?? 60_000,
  );

  if (!result.ok) {
    return { ok: false, error: "Trop de tentatives. Réessayez dans un instant." };
  }

  const rawUserAgent = input.headers.get("user-agent")?.trim();
  return {
    ok: true,
    ipAddress,
    userAgent: rawUserAgent ? rawUserAgent.slice(0, 512) : undefined,
  };
}
