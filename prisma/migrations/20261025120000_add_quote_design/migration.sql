-- Mise en page des devis (studio de document) : modèle, couleur d'accent, police.
-- Migration ADDITIVE (nullable) : les devis existants gardent le rendu par défaut.
ALTER TABLE "quote" ADD COLUMN "design" JSONB;
