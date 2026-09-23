import type { FormFieldType } from "@prisma/client";

export interface MappableField {
  id: string;
  label: string;
  type: FormFieldType;
}

export interface MappedContact {
  firstName: string;
  email?: string;
  phone?: string;
  companyName?: string;
  data: Record<string, string>;
}

const COMPANY_RE = /entreprise|societe|société|company/i;
const NAME_RE = /nom|prénom|prenom|name/i;

/**
 * Déduit un prospect à partir des réponses d'un formulaire (fonction pure).
 * - e-mail / téléphone : premier champ du type correspondant ;
 * - entreprise : champ dont le libellé évoque une société ;
 * - prénom : champ texte « nom/prénom », sinon 1er champ texte, sinon partie
 *   locale de l'e-mail, sinon « Prospect ».
 * Toutes les réponses sont conservées dans `data` (indexé par libellé).
 */
export function mapSubmissionToContact(
  fields: MappableField[],
  values: Record<string, string>,
): MappedContact {
  const data: Record<string, string> = {};
  let email: string | undefined;
  let phone: string | undefined;
  let companyName: string | undefined;
  let firstName: string | undefined;
  let firstTextValue: string | undefined;

  for (const field of fields) {
    const v = (values[field.id] ?? "").trim();
    data[field.label] = v;
    if (!v) continue;
    if (field.type === "EMAIL" && !email) email = v;
    if (field.type === "PHONE" && !phone) phone = v;
    if (field.type === "TEXT" && !firstTextValue) firstTextValue = v;
    if (COMPANY_RE.test(field.label) && !companyName) companyName = v;
    if (!firstName && field.type === "TEXT" && NAME_RE.test(field.label)) firstName = v;
  }

  if (!firstName) firstName = firstTextValue ?? email?.split("@")[0] ?? "Prospect";

  return { firstName, email, phone, companyName, data };
}
