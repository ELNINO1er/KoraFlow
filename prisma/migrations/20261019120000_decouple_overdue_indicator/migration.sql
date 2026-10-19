-- Découplage du RETARD et du STATUT de paiement.
--
-- Le retard devient un indicateur DÉRIVÉ (échéance passée + solde dû), calculé à
-- l'affichage (voir src/lib/constants/invoices.ts: isInvoiceOverdue). Il n'est
-- plus stocké dans Invoice.status, afin qu'une facture puisse être à la fois
-- « partiellement payée » et « en retard ».
--
-- Migration ADDITIVE et rétrocompatible :
--   * la valeur d'enum 'OVERDUE' est CONSERVÉE (aucune suppression de type) ;
--   * les lignes héritées en statut OVERDUE sont normalisées vers leur statut de
--     paiement réel (PARTIALLY_PAID si un acompte a été encaissé, sinon SENT).
--     Le signal de retard est reconstitué à l'affichage, sans perte d'information
--     de paiement. Aucune renumérotation, aucun effacement d'historique.
UPDATE "invoice"
SET "status" = CASE
  WHEN "paidMinor" > 0 THEN 'PARTIALLY_PAID'::"InvoiceStatus"
  ELSE 'SENT'::"InvoiceStatus"
END
WHERE "status" = 'OVERDUE';
