-- Champs requis par le plugin admin Better Auth (impersonation, gestion comptes).
-- `role` = "admin" pour les admins plateforme (synchronisé avec isPlatformAdmin).
-- Les champs de bannissement existent pour le plugin mais ne sont pas utilisés
-- (la suspension est gérée par user.suspendedAt / organization.suspendedAt).

ALTER TABLE "user" ADD COLUMN "role" TEXT;
ALTER TABLE "user" ADD COLUMN "banned" BOOLEAN DEFAULT false;
ALTER TABLE "user" ADD COLUMN "banReason" TEXT;
ALTER TABLE "user" ADD COLUMN "banExpires" TIMESTAMP(3);

-- Session : marqueur d'impersonation (id de l'admin qui impersonne).
ALTER TABLE "session" ADD COLUMN "impersonatedBy" TEXT;
