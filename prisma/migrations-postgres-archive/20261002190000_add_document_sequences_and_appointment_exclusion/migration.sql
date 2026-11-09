-- CreateEnum
CREATE TYPE "DocumentKind" AS ENUM ('QUOTE', 'CONTRACT', 'INVOICE');

-- CreateTable
CREATE TABLE "document_sequence" (
    "id" TEXT NOT NULL,
    "organizationId" TEXT NOT NULL,
    "kind" "DocumentKind" NOT NULL,
    "year" INTEGER NOT NULL,
    "value" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "document_sequence_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "document_sequence_organizationId_kind_year_key"
ON "document_sequence"("organizationId", "kind", "year");

-- AddForeignKey
ALTER TABLE "document_sequence"
ADD CONSTRAINT "document_sequence_organizationId_fkey"
FOREIGN KEY ("organizationId") REFERENCES "organization"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

-- Initialise les compteurs à partir des documents existants. Le suffixe
-- numérique final est conservé, même si le préfixe personnalisé contient '-'.
INSERT INTO "document_sequence" ("id", "organizationId", "kind", "year", "value", "createdAt", "updatedAt")
SELECT
    'seq_' || md5("organizationId" || ':QUOTE:' || substring("number" from '-([0-9]{4})-[0-9]+$')),
    "organizationId",
    'QUOTE'::"DocumentKind",
    substring("number" from '-([0-9]{4})-[0-9]+$')::INTEGER,
    max(substring("number" from '-([0-9]+)$')::INTEGER),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "quote"
WHERE "number" ~ '-[0-9]{4}-[0-9]+$'
GROUP BY "organizationId", substring("number" from '-([0-9]{4})-[0-9]+$');

INSERT INTO "document_sequence" ("id", "organizationId", "kind", "year", "value", "createdAt", "updatedAt")
SELECT
    'seq_' || md5("organizationId" || ':CONTRACT:' || substring("number" from '-([0-9]{4})-[0-9]+$')),
    "organizationId",
    'CONTRACT'::"DocumentKind",
    substring("number" from '-([0-9]{4})-[0-9]+$')::INTEGER,
    max(substring("number" from '-([0-9]+)$')::INTEGER),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "contract"
WHERE "number" ~ '-[0-9]{4}-[0-9]+$'
GROUP BY "organizationId", substring("number" from '-([0-9]{4})-[0-9]+$');

INSERT INTO "document_sequence" ("id", "organizationId", "kind", "year", "value", "createdAt", "updatedAt")
SELECT
    'seq_' || md5("organizationId" || ':INVOICE:' || substring("number" from '-([0-9]{4})-[0-9]+$')),
    "organizationId",
    'INVOICE'::"DocumentKind",
    substring("number" from '-([0-9]{4})-[0-9]+$')::INTEGER,
    max(substring("number" from '-([0-9]+)$')::INTEGER),
    CURRENT_TIMESTAMP,
    CURRENT_TIMESTAMP
FROM "invoice"
WHERE "number" ~ '-[0-9]{4}-[0-9]+$'
GROUP BY "organizationId", substring("number" from '-([0-9]{4})-[0-9]+$');

-- PostgreSQL garantit l'absence de chevauchement, même si deux requêtes de
-- réservation arrivent au même instant.
CREATE EXTENSION IF NOT EXISTS btree_gist;

ALTER TABLE "appointment"
ADD CONSTRAINT "appointment_no_confirmed_overlap"
EXCLUDE USING gist (
    "organizationId" WITH =,
    "appointmentTypeId" WITH =,
    tsrange("startAt", "endAt", '[)') WITH &&
)
WHERE ("status" = 'CONFIRMED');
