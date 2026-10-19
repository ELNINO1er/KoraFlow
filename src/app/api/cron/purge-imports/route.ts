import { purgeExpiredImports } from "@/server/services/import-purge";

/**
 * Purge des fichiers d'import Excel abandonnés (aperçus non confirmés) au-delà
 * du TTL. Protégé par un secret partagé `CRON_SECRET` (en-tête
 * `Authorization: Bearer <CRON_SECRET>`), destiné au planificateur de
 * l'hébergeur (cron Hostinger : `curl -fsS -X POST -H "Authorization: Bearer $CRON_SECRET" https://.../api/cron/purge-imports`).
 * Ne supprime QUE des fichiers temporaires ; les bilans d'audit sont conservés.
 */
async function handle(request: Request): Promise<Response> {
  const secret = process.env.CRON_SECRET;
  if (!secret) return new Response("CRON_SECRET non configuré", { status: 503 });
  if (request.headers.get("authorization") !== `Bearer ${secret}`) {
    return new Response("Non autorisé", { status: 401 });
  }
  const result = await purgeExpiredImports(Date.now());
  return Response.json({ ok: true, ...result }, { headers: { "Cache-Control": "no-store" } });
}

export async function POST(request: Request) {
  return handle(request);
}

export async function GET(request: Request) {
  return handle(request);
}
