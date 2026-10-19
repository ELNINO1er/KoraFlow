# Améliorations devis / factures / contrats — 19 octobre 2026

Suite de `docs/CORRECTIONS_2026-10-19.md`. Toutes les vérifications (tests,
migrations, build) ont été exécutées sur une **base PostgreSQL de test isolée**
et un **stockage local isolé**. Ce document n'emporte aucune conclusion de
conformité juridique ou fiscale.

## 1. Retard & paiement partiel (indicateur dérivé)

**Décision métier :** le *retard* n'est plus un statut, c'est un **indicateur
dérivé**. Le statut `Invoice.status` ne décrit que le paiement
(`DRAFT/SENT/PARTIALLY_PAID/PAID/CANCELED`). Une facture peut donc être
`PARTIALLY_PAID` **et** en retard simultanément.

- Helper unique `isInvoiceOverdue({ status, dueDate })` =
  `status ∈ {SENT, PARTIALLY_PAID}` ET `dueDate < maintenant`
  (`src/lib/constants/invoices.ts`).
- `recomputeInvoicePayment` n'écrit plus jamais `OVERDUE` (il ne pouvait de
  toute façon pas coexister avec `PARTIALLY_PAID`).
- Surfaces harmonisées : liste + **filtre « En retard »** dérivé, fiche,
  portail client, **compteur tableau de bord**, **PDF** (mention « FACTURE EN
  RETARD »).
- Migration de données additive : les lignes héritées `OVERDUE` sont
  normalisées (`paidMinor>0 → PARTIALLY_PAID`, sinon `SENT`). La valeur d'enum
  `OVERDUE` est **conservée** (aucune suppression de type).
- `OVERDUE` n'est plus une transition manuelle sélectionnable.

## 2. Fidélité PDF (français, œ/Œ, €)

- Les polices standard pdf-lib utilisent l'encodage **WinAnsi (CP1252)** qui
  couvre **tout le français** : accents, ligatures **œ/Œ**, **€**, guillemets
  typographiques. Module `src/lib/pdf/winansi.ts`.
- `sanitizeWinAnsi` conserve ces caractères (fini le remplacement par « ? »).
  Vérifié par test : les octets WinAnsi de œ (0x9C), Œ (0x8C), € (0x80) sont
  réellement présents dans le flux de contenu du PDF.
- **Caractères non représentables** (arabe, cyrillique, emoji…) : détectés par
  `collectUnsupportedCharacters` et l'**envoi est bloqué** avec un message
  explicite (devis, factures, contrats) — plus de dégradation silencieuse.
- Paragraphes préservés (notes/conditions), mots très longs coupés, pas de
  troncature silencieuse (pagination).

**Limite assumée :** seuls les alphabets couverts par WinAnsi sont pris en
charge. Les écritures non latines ne sont PAS supportées (elles sont bloquées,
pas rendues). L'embarquement d'une police Unicode reste un chantier distinct.

## 3. Devis — rédaction

- Le champ **Conditions commerciales (`terms`)** est désormais saisissable dans
  le formulaire et transmis au PDF (rubrique « Conditions »). La plomberie
  existait déjà (schéma, service, PDF) ; seule l'UI manquait.
- Bornes de validation alignées sur les factures (montants, nombre de lignes,
  longueurs). Les totaux calculés sont refusés s'ils dépassent la capacité des
  colonnes `Int` (`MAX_MONEY_MINOR`).

## 4. Contrats — modèles réutilisables & variables

**Modèles (`ContractTemplate`)** — bout en bout :
- Dépôt `contract-template-repository.ts` (CRUD scopé organisation + soft-delete).
- Service (`contract-service.ts`) avec permissions `contracts.*` :
  `list/get/create/update/duplicate/archive`.
- Actions `template-actions.ts` + UI : `/contrats/modeles` (liste),
  `/contrats/modeles/nouveau`, `/contrats/modeles/[id]` (édition), avec
  insertion assistée des variables et **aperçu** (données d'exemple).
- **Sélection d'un modèle à la génération** depuis la fiche devis (sinon modèle
  par défaut).
- **Conservation** : le contrat stocke `templateId` ET le **texte figé rendu**
  (`content`). Modifier le modèle ensuite **ne change pas** un contrat déjà
  généré ou signé.

**Variables** — catalogue + résolution stricte (`src/lib/contracts/variables.ts`) :
- Catalogue des variables disponibles : `org_name`, `client_name`,
  `quote_number`, `total_ttc`, `date`.
- `resolveTemplate` **ne vide plus** une variable inconnue : elle est signalée
  (laissée visible `{{clef}}`), de même qu'une variable connue non renseignée.
- Validation à l'enregistrement du modèle (variables hors catalogue refusées) et
  **blocage de la génération** si une variable reste non résolue, avec message
  précis listant les variables en cause.

Les modèles sont des **aides rédactionnelles** à adapter — aucune garantie de
validité juridique.

## 5. Archivage des documents finalisés

Sous-système générique (`DocumentArchive`) : instantané + PDF de référence
conservé dans le **stockage privé**.

- **Modèle** `DocumentArchive` (migration additive `add_document_archive`) :
  `documentType`, `documentId`, `version`, `reason`, `snapshot` (JSON de
  restitution : émetteur, client, lignes/montants pertinents, contenu, signataire),
  `contentHash`, `pdfStorageKey`, `pdfSha256`, `status` (PENDING/STORED/FAILED),
  `publicToken`. Unicité `(org, type, documentId, version)`.
- **Service** `document-archive-service.ts` :
  - Crée/réutilise une version PENDING (transaction **sérialisable** → sûr en
    concurrence, pas de doublon).
  - Conserve le PDF en **écriture unique (write-once)** : `putPrivateFile` échoue
    si la clé existe (local `wx`, S3 `IfNoneMatch`). Jamais d'écrasement
    silencieux.
  - **Idempotent** : un ré-archivage du même (document, raison) renvoie l'archive
    existante ; une clé déjà présente est traitée comme reprise (empreinte alignée
    sur le fichier réellement conservé).
  - **États explicites** : échec de stockage → `FAILED` (reprise possible),
    succès → `STORED` + `pdfSha256`.
- **Intégration** : à la **signature d'un contrat**, le PDF signé est archivé
  (raison `SIGNED`), de façon **non bloquante** (un échec laisse `FAILED` sans
  invalider la signature déjà enregistrée).
- **Accès** : route authentifiée `/api/archives/[id]` scopée organisation
  (404 pour une autre organisation) ; la fiche contrat liste les versions
  archivées avec téléchargement du PDF **réellement conservé** (non régénéré).
- **Immutabilité réelle** : une modification ultérieure du logo, du client, du
  catalogue ou d'un modèle **ne change pas** l'archive (PDF figé + empreinte).

**Garantie exacte (important) :** un fichier conservé et protégé par
l'application **n'est pas** un stockage WORM ni un archivage certifié. Il n'y a
pas de scellement cryptographique du PDF ni d'horodatage qualifié.

**Documents historiques :** aucune « version originale » n'est fabriquée
rétroactivement. Seuls les documents finalisés **après** cette mise en place
disposent d'une archive. Les documents antérieurs n'en ont pas ; il ne faut pas
présenter une régénération ultérieure comme l'original.

**Couverture actuelle :** l'archivage est **câblé pour les contrats signés**. Le
service est générique (QUOTE/INVOICE pris en charge par le modèle) mais n'est pas
encore déclenché à l'envoi d'une facture ni à l'acceptation d'un devis — voir
« Reste à faire ».

## 6. Numérotation & historique (inchangés)

Aucune renumérotation des documents existants. Aucun effacement d'historique.
Les brouillons restent modifiables ; une correction d'un document émis suit le
parcours de réouverture existant (avec rotation du lien public pour les
contrats) ; un document signé/payé n'est jamais réécrit silencieusement.

## 7. Reste à faire (chantiers distincts, non implémentés)

- Archivage automatique **à l'envoi de facture** et **à l'acceptation de devis**
  (le sous-système est prêt ; il reste à appeler `archiveDocument` dans ces
  flux, avec snapshot dédié).
- Aperçu document **partagé** pour le devis (la facture a un aperçu riche ; le
  devis n'a qu'un récapitulatif chiffré).
- Édition/brouillon repris pour les devis (parité avec les factures).
- Police PDF Unicode pour les écritures non latines.
- OTP de signature (chantier distinct, n'empêche pas les autres corrections).
- Avoirs, échéanciers, relances automatiques : **non disponibles**.
