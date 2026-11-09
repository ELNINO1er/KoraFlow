-- CreateEnum
CREATE TYPE "DocumentArchiveType" AS ENUM ('QUOTE', 'INVOICE', 'CONTRACT');

-- CreateEnum
CREATE TYPE "DocumentArchiveStatus" AS ENUM ('PENDING', 'STORED', 'FAILED');

-- CreateTable
CREATE TABLE "document_archive" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "documentType" "DocumentArchiveType" NOT NULL,
    "documentId" TEXT NOT NULL,
    "version" INTEGER NOT NULL,
    "reason" TEXT NOT NULL,
    "snapshot" JSONB NOT NULL,
    "contentHash" TEXT,
    "pdfStorageKey" TEXT,
    "pdfSha256" TEXT,
    "status" "DocumentArchiveStatus" NOT NULL DEFAULT 'PENDING',
    "publicToken" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_archive_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_archive_publicToken_key" ON "document_archive"("publicToken");

-- CreateIndex
CREATE INDEX "document_archive_organizationId_documentType_documentId_idx" ON "document_archive"("organizationId", "documentType", "documentId");

-- CreateIndex
CREATE UNIQUE INDEX "document_archive_organizationId_documentType_documentId_ver_key" ON "document_archive"("organizationId", "documentType", "documentId", "version");

-- AddForeignKey
ALTER TABLE "document_archive" ADD CONSTRAINT "document_archive_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
