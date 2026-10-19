-- Références externes facultatives pour l'import/réimport Excel.
-- Migration ADDITIVE : colonnes nullables + index unique par organisation.
-- Les NULL multiples sont autorisés par un index unique PostgreSQL ; seules les
-- références RENSEIGNÉES doivent être uniques au sein d'une organisation.
ALTER TABLE "contact" ADD COLUMN "externalRef" TEXT;
ALTER TABLE "service" ADD COLUMN "reference" TEXT;

CREATE UNIQUE INDEX "contact_organizationId_externalRef_key" ON "contact"("organizationId", "externalRef");
CREATE UNIQUE INDEX "service_organizationId_reference_key" ON "service"("organizationId", "reference");
