-- Jeton public pour la consultation du devis (portail client, hors auth).
ALTER TABLE "quote" ADD COLUMN "publicToken" TEXT;
CREATE UNIQUE INDEX "quote_publicToken_key" ON "quote"("publicToken");
