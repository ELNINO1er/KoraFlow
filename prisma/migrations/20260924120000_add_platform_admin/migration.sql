-- Administration de plateforme (super admin transverse) + suspension de comptes/orgs.
-- Colonnes ajoutées avec valeurs par défaut sûres : aucun compte n'est admin
-- plateforme par défaut, rien n'est suspendu. Backfill implicite via DEFAULT.

-- User : drapeau admin plateforme + suspension
ALTER TABLE "user" ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "user" ADD COLUMN "suspendedAt" TIMESTAMP(3);

-- Organization : suspension
ALTER TABLE "organization" ADD COLUMN "suspendedAt" TIMESTAMP(3);
