-- CreateTable
CREATE TABLE "document" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "projectId" TEXT NOT NULL,
    "uploadedById" TEXT,
    "storageKey" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "mimeType" TEXT NOT NULL,
    "sizeBytes" INTEGER NOT NULL,
    "sha256" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "deletedAt" TIMESTAMP(3),

    CONSTRAINT "document_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_organizationId_storageKey_key"
ON "document"("organizationId", "storageKey");

-- CreateIndex
CREATE INDEX "document_organizationId_projectId_createdAt_idx"
ON "document"("organizationId", "projectId", "createdAt");

-- AddForeignKey
ALTER TABLE "document"
ADD CONSTRAINT "document_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document"
ADD CONSTRAINT "document_projectId_fkey"
FOREIGN KEY ("projectId") REFERENCES "project"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "document"
ADD CONSTRAINT "document_uploadedById_fkey"
FOREIGN KEY ("uploadedById") REFERENCES "user"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
