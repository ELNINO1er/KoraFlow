"use client";

import { ImportExcelDialog } from "@/features/shared/import-excel-dialog";
import { commitServicesImportAction } from "@/features/services/import-actions";

const FIELD_LABELS: Record<string, string> = {
  reference: "Référence", name: "Nom*", description: "Description", category: "Catégorie",
  unit: "Unité", priceMajor: "Prix unitaire HT", taxRate: "Taux de taxe (%)",
  estimatedDurationMinutes: "Durée (min)", active: "Actif",
};

export function ImportServicesDialog() {
  return (
    <ImportExcelDialog
      title="Importer des services (.xlsx)"
      entityNoun="service(s)"
      previewUrl="/api/services/import/preview"
      templateUrl="/api/services/template"
      fieldLabels={FIELD_LABELS}
      previewColumns={[{ key: "name", label: "Nom" }, { key: "priceMinor", label: "Prix (minor)" }]}
      commitAction={commitServicesImportAction}
    />
  );
}
