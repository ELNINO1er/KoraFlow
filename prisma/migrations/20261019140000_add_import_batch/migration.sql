-- Lots d'import Excel : idempotence anti-rejeu + bilan d'audit. Migration additive.
CREATE TYPE "ImportKind" AS ENUM ('CONTACT', 'SERVICE');
CREATE TYPE "ImportBatchStatus" AS ENUM ('COMPLETED', 'FAILED');

CREATE TABLE "import_batch" (
  "id" TEXT NOT NULL,
  "organizationId" TEXT NOT NULL,
  "userId" TEXT,
  "kind" "ImportKind" NOT NULL,
  "idempotencyKey" TEXT NOT NULL,
  "status" "ImportBatchStatus" NOT NULL,
  "summary" JSONB NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "import_batch_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "import_batch_organizationId_idempotencyKey_key" ON "import_batch"("organizationId", "idempotencyKey");
CREATE INDEX "import_batch_organizationId_kind_createdAt_idx" ON "import_batch"("organizationId", "kind", "createdAt");

ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_organizationId_fkey" FOREIGN KEY ("organizationId") REFERENCES "organization"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "import_batch" ADD CONSTRAINT "import_batch_userId_fkey" FOREIGN KEY ("userId") REFERENCES "user"("id") ON DELETE SET NULL ON UPDATE CASCADE;
