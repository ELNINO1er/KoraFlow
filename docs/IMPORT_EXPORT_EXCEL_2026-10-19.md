# Import / Export Excel — Clients & Catalogue de services (19 oct. 2026)

Fonctionnalités branchées dans l'interface (pages **Clients** et **Catalogue**) :
boutons **Importer Excel**, **Exporter Excel**, **Télécharger le modèle**. L'import
et la saisie manuelle coexistent. Format **.xlsx uniquement** (le `.xls` hérité
n'est **pas** pris en charge ; aucun CSV n'est proposé pour l'instant).

Bibliothèque : **exceljs** (maintenue). Les formules ne sont **jamais évaluées**
et un fichier en contenant est **refusé**.

## Parcours d'import (assistant)
1. Choisir/glisser un fichier `.xlsx`.
2. Correspondance des colonnes (auto-reconnue depuis les en-têtes FR ; ajustable).
3. Aperçu + validation serveur : chaque ligne est classée **À créer / Existe déjà
   / Doublon fichier / Rejeté** avec motifs ; rapport d'erreurs téléchargeable
   (numéros de ligne d'origine).
4. Confirmation explicite (aucune écriture avant cette étape).
5. Résultat : créés / ignorés / rejetés, succès total ou partiel affiché.

La **validation du commit est refaite côté serveur** (indépendante de l'aperçu
navigateur) : le fichier est conservé temporairement en stockage privé, lié à
l'utilisateur et à l'organisation, puis relu et re-validé à la confirmation, et
supprimé après traitement.

## Clients — colonnes
| Colonne | Obligatoire | Format |
|---|---|---|
| Prénom | **Oui** | Texte |
| Nom | Non | Texte |
| Entreprise | Non | Texte |
| E-mail | Non | Adresse valide (sinon ligne rejetée) |
| Téléphone | Non | **Texte** (zéros initiaux et `+` conservés) |
| Source | Non | Texte |
| Notes | Non | Texte |
| Référence | Non | Identifiant stable (déduplication / réimport) |

## Services — colonnes
| Colonne | Obligatoire | Format |
|---|---|---|
| Référence | Non | Identifiant stable (déduplication / réimport) |
| Nom | **Oui** | Texte |
| Description | Non | Texte |
| Catégorie | Non | Texte |
| Unité | Non | forfait / heure / jour / mois / unité / projet |
| Prix unitaire HT | Non | **En devise de l'organisation**, HT. Virgule ou point décimal, espaces de milliers acceptés. Les décimales ne doivent pas dépasser celles de la devise (ex. XOF = 0 décimale). Aucune conversion de devise. |
| Taux de taxe (%) | Non | Entier 0 à 100 |
| Durée (min) | Non | Entier de minutes |
| Actif | Non | Oui / Non (défaut Oui) |

Le prix est saisi en **unité monétaire habituelle** (pas en valeur interne
« minor ») ; il est converti selon les décimales de la devise. Prix négatif,
dépassement de capacité (> 2 000 000 000) ou taxe hors bornes ⇒ ligne rejetée.

## Doublons et réimport
- **Doublon dans le fichier** : même Référence (ou même e-mail pour les clients)
  répétée ⇒ ligne ignorée (signalée).
- **Déjà présent dans l'organisation** : Référence (clients : ou e-mail) déjà
  connue ⇒ ligne classée « existante » et **ignorée** (aucun écrasement).
- Le **nom seul ne fusionne jamais** deux fiches.
- Comportement par défaut : **créer les nouveaux, ignorer les doublons/existants**.
  La mise à jour des existants n'est pas activée (aucune donnée écrasée). Pour
  mettre à jour un élément, utilisez la référence et l'édition manuelle.

## Idempotence (anti-rejeu)
Chaque import confirmé porte une **clé d'idempotence** (générée par l'assistant).
Une double confirmation ou une reprise réseau **ne rejoue pas** le lot : le bilan
du premier lot est renvoyé. Trace conservée dans `import_batch` (bilan d'audit,
sans recopie des données personnelles). Cette idempotence technique est distincte
de la gestion métier des doublons ci-dessus.

## Limites
- Format `.xlsx` uniquement. Taille max **5 Mo**. Max **5000 lignes** par import.
- Feuille de données : « Clients »/« Services » ; la feuille « Instructions »
  (modèle) n'est jamais importée.

## Export
- `.xlsx` réimportable, **toutes** les lignes autorisées (au-delà de la page
  affichée), respectant les filtres de la liste (recherche/étape).
- Téléphones et références écrits comme **texte** ; prix services en unité +
  devise. Aucun secret, jeton public, ni identifiant d'une autre organisation.

## Sécurité
- Authentification + permissions à chaque opération : import ⇒ `*.create`,
  export/modèle ⇒ `*.view` (contacts/services). Isolation stricte par organisation.
- Upload même origine, limites de taille/lignes, formules refusées, textes
  exportés neutralisés contre l'injection de formule.
- Aucun fichier client n'est envoyé à un service externe.

## Fichiers
- Lib : `src/lib/excel/{workbook,number-fr,headers,upload}.ts`
- Clients : `src/server/services/contacts-excel.ts`, `src/app/api/clients/{export,template,import/preview}/route.ts`, `src/features/contacts/{import-actions,import-dialog}.tsx`
- Services : `src/server/services/services-excel.ts`, `src/app/api/services/{export,template,import/preview}/route.ts`, `src/features/services/{import-actions,import-dialog}.tsx`
- Assistant partagé : `src/features/shared/import-excel-dialog.tsx`
- Schéma : `Contact.externalRef`, `Service.reference`, modèle `ImportBatch` (migrations `add_external_references`, `add_import_batch`).
