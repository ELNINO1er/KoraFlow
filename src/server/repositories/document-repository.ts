import { prisma } from "../database/client";

export function listProjectDocuments(organizationId: string, projectId: string) {
  return prisma.document.findMany({
    where: { organizationId, projectId, deletedAt: null, project: { deletedAt: null } },
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      originalName: true,
      mimeType: true,
      sizeBytes: true,
      sha256: true,
      createdAt: true,
      uploadedBy: { select: { name: true } },
    },
  });
}

export function getDocumentById(organizationId: string, id: string) {
  return prisma.document.findFirst({
    where: { id, organizationId, deletedAt: null, project: { deletedAt: null } },
  });
}

export async function createDocument(
  organizationId: string,
  data: {
    projectId: string;
    uploadedById: string;
    storageKey: string;
    originalName: string;
    mimeType: string;
    sizeBytes: number;
    sha256: string;
  },
) {
  const project = await prisma.project.findFirst({
    where: { id: data.projectId, organizationId, deletedAt: null },
    select: { id: true },
  });
  if (!project) return null;

  return prisma.document.create({ data: { organizationId, ...data } });
}

export async function softDeleteDocument(organizationId: string, id: string) {
  const document = await getDocumentById(organizationId, id);
  if (!document) return null;
  const result = await prisma.document.updateMany({
    where: { id, organizationId, deletedAt: null },
    data: { deletedAt: new Date() },
  });
  return result.count > 0 ? document : null;
}
