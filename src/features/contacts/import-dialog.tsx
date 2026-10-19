"use client";

import { ImportExcelDialog } from "@/features/shared/import-excel-dialog";
import { commitContactsImportAction } from "@/features/contacts/import-actions";

const FIELD_LABELS: Record<string, string> = {
  firstName: "Prénom*", lastName: "Nom", companyName: "Entreprise", email: "E-mail",
  phone: "Téléphone", source: "Source", notes: "Notes", externalRef: "Référence",
};

export function ImportContactsDialog() {
  return (
    <ImportExcelDialog
      title="Importer des clients (.xlsx)"
      entityNoun="client(s)"
      previewUrl="/api/clients/import/preview"
      templateUrl="/api/clients/template"
      fieldLabels={FIELD_LABELS}
      previewColumns={[{ key: "firstName", label: "Prénom" }, { key: "email", label: "E-mail" }]}
      commitAction={commitContactsImportAction}
    />
  );
}
