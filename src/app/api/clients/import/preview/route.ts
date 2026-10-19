import { resolveSession } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { prepareContactImport } from "@/server/services/contacts-excel";
import { hasSameOrigin, isXlsxFile, MAX_IMPORT_FILE_SIZE } from "@/lib/excel/upload";

/**
 * Aperçu d'un import de clients : reçoit le .xlsx, le conserve (lié à
 * l'utilisateur+org), reconnaît les colonnes, valide et classe les lignes.
 * N'écrit AUCUN client (la création a lieu uniquement à la confirmation).
 */
export async function POST(request: Request) {
  if (!hasSameOrigin(request)) return new Response("Origine refusée", { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_IMPORT_FILE_SIZE + 256 * 1024) {
    return Response.json({ ok: false, error: "Fichier trop volumineux (max 5 Mo)." }, { status: 413 });
  }

  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  if (!can(session.context.role, "contacts.create")) {
    return Response.json({ ok: false, error: "Permission d'import insuffisante." }, { status: 403 });
  }

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return Response.json({ ok: false, error: "Fichier manquant." }, { status: 400 });
  if (!isXlsxFile(file)) return Response.json({ ok: false, error: "Format non pris en charge : fournissez un fichier .xlsx." }, { status: 400 });
  if (file.size > MAX_IMPORT_FILE_SIZE) return Response.json({ ok: false, error: "Fichier trop volumineux (max 5 Mo)." }, { status: 413 });

  const sheet = (formData.get("sheet") as string) || undefined;
  let mapping: Record<string, number> | undefined;
  const rawMapping = formData.get("mapping");
  if (typeof rawMapping === "string" && rawMapping) {
    try {
      const parsed = JSON.parse(rawMapping) as Record<string, unknown>;
      mapping = {};
      for (const [k, v] of Object.entries(parsed)) {
        if (typeof v === "number" && Number.isInteger(v) && v >= 0) mapping[k] = v;
      }
    } catch {
      return Response.json({ ok: false, error: "Correspondance de colonnes invalide." }, { status: 400 });
    }
  }
  const buffer = Buffer.from(await file.arrayBuffer());
  const result = await prepareContactImport(session.context, buffer, mapping, sheet);
  return Response.json(result, { status: result.ok ? 200 : 400 });
}
