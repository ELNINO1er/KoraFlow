-- Champs rédactionnels des devis et factures. Migration ADDITIVE (nullable).
ALTER TABLE "quote" ADD COLUMN "title" TEXT;
ALTER TABLE "quote" ADD COLUMN "introduction" TEXT;
ALTER TABLE "quote" ADD COLUMN "sections" JSONB;

ALTER TABLE "invoice" ADD COLUMN "title" TEXT;
ALTER TABLE "invoice" ADD COLUMN "introduction" TEXT;
ALTER TABLE "invoice" ADD COLUMN "terms" TEXT;
ALTER TABLE "invoice" ADD COLUMN "sections" JSONB;
