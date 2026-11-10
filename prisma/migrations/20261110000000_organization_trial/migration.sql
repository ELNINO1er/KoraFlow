-- Période d'essai gratuite des organisations.
-- Colonne NULLABLE sans valeur par défaut : les organisations existantes gardent
-- NULL (= aucune limite) et ne sont donc pas bloquées par le déploiement.
-- Seules les organisations créées après cette version reçoivent une date de fin.
ALTER TABLE `organization` ADD COLUMN `trialEndsAt` DATETIME(3) NULL;
