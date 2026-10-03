import "server-only";
import { createHash, randomUUID } from "node:crypto";
import type { AuthContext } from "../auth/context";
import { assertCan } from "../permissions/permissions";
import { prisma } from "../database/client";
import * as documents from "../repositories/document-repository";
import { deletePrivateFile, getPrivateFile, putPrivateFile } from "../storage/private-storage";
import { inspectPrivateFile } from "@/lib/documents/file-validation";

export async function listProjectDocuments(ctx: AuthContext, projectId: string) {
  assertCan(ctx.role, "documents.view");
  return documents.listProjectDocuments(ctx.organizationId, projectId);
}

export async function uploadProjectDocument(
  ctx: AuthContext,
  projectId: string,
  input: { name: string; bytes: Uint8Array },
) {
  assertCan(ctx.role, "documents.create");
  const inspected = inspectPrivateFile(input.name, input.bytes);
  const storageKey = `${ctx.organizationId}/${projectId}/${randomUUID()}.${inspected.extension}`;

  await putPrivateFile(storageKey, input.bytes);
  try {
    const document = await documents.createDocument(ctx.organizationId, {
      projectId,
      uploadedById: ctx.user.id,
      storageKey,
      originalName: inspected.originalName,
      mimeType: inspected.mimeType,
      sizeBytes: inspected.sizeBytes,
      sha256: inspected.sha256,
    });
    if (!document) {
      await deletePrivateFile(storageKey);
      return null;
    }
    await prisma.auditLog.create({
      data: {
        organizationId: ctx.organizationId,
        actorUserId: ctx.user.id,
        action: "document.uploaded",
        targetType: "Document",
        targetId: document.id,
        metadata: { projectId, mimeType: inspected.mimeType, sizeBytes: inspected.sizeBytes },
      },
    });
    return document;
  } catch (error) {
    await prisma.document.deleteMany({
      where: { organizationId: ctx.organizationId, storageKey },
    });
    await deletePrivateFile(storageKey);
    throw error;
  }
}

export async function downloadDocument(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "documents.view");
  const document = await documents.getDocumentById(ctx.organizationId, id);
  if (!document) return null;
  const buffer = await getPrivateFile(document.storageKey);
  const hash = createHash("sha256").update(buffer).digest("hex");
  if (hash !== document.sha256 || buffer.length !== document.sizeBytes) {
    throw new Error("Intégrité du document invalide.");
  }
  return { document, buffer };
}

export async function deleteDocument(ctx: AuthContext, id: string) {
  assertCan(ctx.role, "documents.delete");
  const document = await documents.softDeleteDocument(ctx.organizationId, id);
  if (!document) return false;
  await deletePrivateFile(document.storageKey);
  await prisma.auditLog.create({
    data: {
      organizationId: ctx.organizationId,
      actorUserId: ctx.user.id,
      action: "document.deleted",
      targetType: "Document",
      targetId: id,
      metadata: { projectId: document.projectId },
    },
  });
  return true;
}
