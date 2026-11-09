-- Jeton d'accès au portail client unifié (contact).
ALTER TABLE "contact" ADD COLUMN "portalToken" TEXT;
CREATE UNIQUE INDEX "contact_portalToken_key" ON "contact"("portalToken");
