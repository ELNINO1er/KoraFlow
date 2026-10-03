import { resolveSession } from "@/server/auth/context";
import { PermissionError } from "@/server/permissions/permissions";
import { downloadDocument } from "@/server/services/document-service";
import { privateFileResponse } from "@/lib/http/file-response";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });

  try {
    const { id } = await params;
    const result = await downloadDocument(session.context, id);
    if (!result) return new Response("Document introuvable", { status: 404 });
    return privateFileResponse(
      new Uint8Array(result.buffer),
      result.document.originalName,
      result.document.mimeType,
    );
  } catch (error) {
    if (error instanceof PermissionError) return new Response("Accès refusé", { status: 403 });
    throw error;
  }
}
