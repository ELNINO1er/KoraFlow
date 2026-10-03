import { resolveSession } from "@/server/auth/context";
import { PermissionError } from "@/server/permissions/permissions";
import { uploadProjectDocument } from "@/server/services/document-service";
import {
  documentErrorMessage,
  InvalidDocumentError,
  MAX_PRIVATE_FILE_SIZE,
} from "@/lib/documents/file-validation";

function redirectToProject(request: Request, projectId: string, result: string): Response {
  const url = new URL(`/projets/${projectId}`, request.url);
  url.searchParams.set("document", result);
  return Response.redirect(url, 303);
}

function hasSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  const expected = new URL(process.env.APP_URL || request.url).origin;
  return origin === expected;
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  if (!hasSameOrigin(request)) return new Response("Origine refusée", { status: 403 });
  const contentLength = Number(request.headers.get("content-length") || 0);
  if (contentLength > MAX_PRIVATE_FILE_SIZE + 1024 * 1024) {
    return new Response("Fichier trop volumineux", { status: 413 });
  }

  const session = await resolveSession();
  if (session.status !== "ok") return new Response("Non autorisé", { status: 401 });

  try {
    const formData = await request.formData();
    const file = formData.get("file");
    if (!(file instanceof File)) return redirectToProject(request, id, "missing");

    const bytes = new Uint8Array(await file.arrayBuffer());
    const document = await uploadProjectDocument(session.context, id, {
      name: file.name,
      bytes,
    });
    return redirectToProject(request, id, document ? "uploaded" : "project-not-found");
  } catch (error) {
    if (error instanceof PermissionError) return new Response("Accès refusé", { status: 403 });
    if (error instanceof InvalidDocumentError) {
      const url = new URL(`/projets/${id}`, request.url);
      url.searchParams.set("document", "invalid");
      url.searchParams.set("reason", documentErrorMessage(error));
      return Response.redirect(url, 303);
    }
    throw error;
  }
}
