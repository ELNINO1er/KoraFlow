import { resolveSession } from "@/server/auth/context";
import { can } from "@/server/permissions/permissions";
import { buildContactTemplate } from "@/server/services/contacts-excel";
import { XLSX_CONTENT_TYPE } from "@/lib/excel/upload";

/** Modèle .xlsx d'import clients (feuille de saisie + feuille d'instructions). */
export async function GET() {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });
  if (!can(session.context.role, "contacts.create")) return new Response("Accès refusé", { status: 403 });

  const buffer = await buildContactTemplate();
  return new Response(new Uint8Array(buffer), {
    headers: {
      "Content-Type": XLSX_CONTENT_TYPE,
      "Content-Disposition": `attachment; filename="modele-clients.xlsx"`,
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
