# Corrections signature / facturation / exploitation — 19 octobre 2026

Document de référence des corrections apportées à la suite de la contre-analyse
du 18 octobre 2026 (`docs/CONTRE_ANALYSE_CLAUDE_2026-10-18.md`). Vérifications
menées sur une **base PostgreSQL de test isolée et dédiée** (jamais la base de
développement ni la production). Ce document ne constitue pas une validation
juridique ou fiscale.

## 1. Constats confirmés puis corrigés

### Signature de contrat
- **Consentement non vérifié côté serveur** → l'action exige désormais un
  consentement explicite (`consent: true`) ET l'empreinte de la version lue.
  `src/features/contracts/public-actions.ts`, `src/server/services/contract-service.ts`.
- **Version lue ≠ version signée** → l'empreinte SHA-256 de la version affichée
  est transmise par la page et revérifiée côté serveur ; divergence = refus avec
  invitation à recharger. `src/app/c/[token]/page.tsx`, `src/lib/contracts/hash.ts`.
- **Correction concurrente pouvant rouvrir un contrat signé** → réouverture
  atomique conditionnée au statut `SENT` (`reopenContractToDraft`) ; transitions
  de statut conditionnées au statut lu. `src/server/repositories/contract-repository.ts`,
  `src/server/services/contract-service.ts`.
- **Écriture de signature non transactionnelle** → bascule `SENT→SIGNED`,
  événements `CONSENT` et `SIGNED`, et journal d'audit sont écrits dans **une
  seule transaction** (`recordSignature`). Plus d'événement orphelin possible.
- **Notification bloquante** → l'envoi de la notification/e-mail a lieu **après**
  le commit et son échec n'invalide plus la signature (try/catch).

### Liens et PDF publics
- **Route PDF contrat sans protection** → validation du format du jeton +
  limite de génération, à l'identique des routes devis/factures.
  `src/app/api/c/[token]/pdf/route.ts`.
- **Accès par statut** → le PDF et la page publics ne sont servis que pour un
  contrat `SENT` ou `SIGNED` ; un brouillon renvoie 404, un contrat annulé est
  masqué. `src/server/services/contract-pdf.ts`, `src/app/c/[token]/page.tsx`.
- **Rotation du lien à la correction** → le `publicToken` est régénéré lors de
  la réouverture pour correction (ancien lien révoqué).
- **E-mail du signataire non vérifié** → le certificat PDF n'affiche plus
  l'adresse comme preuve d'identité : « Lien transmis à : … (adresse non
  vérifiée) ». `src/server/pdf/render-contract.ts`.

### Devis et factures
- **Double génération de facture** → `generateFromQuote` est **idempotent et
  sûr en concurrence** (transaction sérialisable avec rejeu) : une facture au
  plus est générée par devis via ce parcours ; une facture existante est
  renvoyée telle quelle. `src/server/repositories/invoice-repository.ts`,
  `src/server/services/invoice-service.ts`.
- **Acceptation d'un devis expiré** → refusée côté serveur au moment de l'acte
  (le refus reste possible) ; bascule `EXPIRED` si l'échéance est passée.
  `src/server/repositories/quote-repository.ts`, `src/features/quotes/public-actions.ts`.
- **Perte silencieuse de l'état OVERDUE** → le recalcul rétablit/préserve
  `OVERDUE` pour une facture impayée dont l'échéance est dépassée.
  `src/server/repositories/invoice-repository.ts`.
- **Bornes de montants vs colonnes `Int`** → tout total calculé est refusé avant
  écriture s'il dépasse `MAX_MONEY_MINOR` (2 000 000 000 < max `int4`), évitant
  une erreur base « integer out of range ». Bornes Zod des devis alignées sur
  celles des factures. `src/lib/quotes/totals.ts`, `src/features/quotes/actions.ts`.

### PDF (hors signature)
- **Montant payé / solde absents sur la facture** → le PDF facture affiche
  désormais « Déjà payé » et « Solde dû » réels. `src/server/pdf/render-quote.ts`,
  `src/server/services/invoice-pdf.ts`.
- **Troncature silencieuse des clauses** → notes et conditions ne sont plus
  coupées à 4 lignes : elles sont **paginées** si nécessaire.

## 2. Constats écartés (vérifiés, non problématiques)

- **`NODE_ENV` absent = blocage** : écarté. `next start` positionne
  `NODE_ENV=production` quand la variable est absente (vérifié dans
  `node_modules/next/dist/bin/next`). Aucune modification de code nécessaire ;
  conserver `NODE_ENV=production` explicitement reste une bonne pratique.
- **Numéro de document consommé par une transaction échouée** : écarté.
  `DocumentSequence` est une ligne de table incrémentée *dans* la transaction de
  création ; un échec annule l'incrément (ce n'est pas un `nextval` natif).
- **Webpack (prod) vs Turbopack (dev)** : différence réelle, panne non démontrée.
  Le contrôle retenu est de **construire avec la commande de production**
  (`hostinger:build`) — fait en validation.
- **`output: "standalone"`** : utile au chemin Docker, neutre pour `next start`.
  Pas un incident.
- **Fallback logo facture** : `drawLogo` intercepte déjà l'erreur et continue
  sans logo ; pas de correctif nécessaire.

## 3. Politique de numérotation (clarification)

- Numéros attribués par organisation et par type via `DocumentSequence`
  (`PREFIX-AAAA-NNNN`), réinitialisés chaque année, incrémentés de façon atomique
  dans la transaction de création.
- Le numéro est attribué **dès le brouillon**. La suppression d'un brouillon
  laisse donc un numéro non réutilisé (trou). Ce comportement est **conservé**
  et ne doit pas être « rebouché » : **aucun document existant n'est renuméroté**.
- Recommandation (chantier, non bloquant) : si une numérotation « émise sans
  rupture » est exigée réglementairement, dissocier un numéro de brouillon
  interne d'un numéro d'émission attribué au passage `SENT`/`PAID`. À décider au
  niveau métier/juridique — non implémenté ici pour ne pas renuméroter l'existant.

## 4. Exploitation (Hostinger / Docker)

- **Stockage** : deux stratégies délibérées, désormais explicitées.
  - Docker mono-instance (`docker-compose.prod.yml`) : `STORAGE_DRIVER=local` est
    **forcé** par l'override `environment:` (prioritaire sur `env_file`) ; les
    variables `S3_*` du `.env.production` sont **ignorées** sur ce chemin.
    Commentaire ajouté dans le compose.
  - Hostinger / non-Docker / multi-instance : S3 (Supabase/R2/S3).
    `.env.production.example` clarifié en conséquence.
- **Variables** : `TRUSTED_ORIGINS` ajouté et documenté (lu par
  `src/server/auth/auth.ts`). `DEFAULT_LOCALE`/`DEFAULT_CURRENCY` annotés comme
  **réservés / non lus** (la langue et la devise effectives sont celles de
  l'organisation).

### Stratégie de migration (compatibilité avec le code en production)
`hostinger:build` exécute `prisma migrate deploy && next build`. Si le build
échoue après la migration, la base est déjà migrée alors que l'ancien code reste
en ligne. Règle à respecter :

1. **Migrations rétrocompatibles** (expand/contract) : d'abord ajouter
   (colonnes/tables *nullable* ou avec défaut) sans rien supprimer ; déployer le
   code qui les utilise ; ne supprimer l'ancien schéma qu'une fois l'ancien code
   retiré, dans une migration ultérieure.
2. Éviter dans la même release une migration destructive (DROP/RENAME/NOT NULL
   sans défaut) ET un changement de code qui en dépend.
3. En cas d'échec du build après migration : l'ancien code doit continuer à
   fonctionner sur le schéma migré (garanti par le point 1), puis relancer le
   déploiement.

Les correctifs de cette itération **ne comportent aucune migration de schéma**
(uniquement de la logique applicative), donc aucun risque de drift introduit.

## 5. Risques résiduels et chantiers non traités

Corrections indispensables **faites**. Restent des **chantiers fonctionnels** à
planifier (hors périmètre des correctifs de fiabilité) :

- **Archivage immuable du document finalisé** : aujourd'hui le contenu et
  l'empreinte sont figés en base et le PDF est régénéré (le logo/nom d'org peut
  dériver). Chantier : stocker le PDF signé (ou un instantané de l'identité
  d'organisation) via migration *additive* + stockage privé, pour une restitution
  exacte. Non implémenté ici (migration + stockage = nouveau périmètre).
- **Caractères non latins dans les PDF** : Helvetica (police standard) ne couvre
  pas les scripts non latins ; `safeText` remplace par « ? » (perte visible, non
  silencieuse). Chantier : embarquer une police Unicode (fontkit + fichier TTF).
- **Modèles de contrat réutilisables** : schéma et paramètres présents, aucun
  CRUD/UI. À implémenter ou retirer le code mort.
- **Avoirs / notes de crédit** : absents. Nouveau modèle + PDF à concevoir.
- **Acomptes** : montant calculé/affiché ; manque un parcours de facture
  d'acompte et d'échéancier (plusieurs factures par devis **non interdites** au
  niveau base, mais pas encore exposées par un parcours dédié).
- **Relances / passage automatique OVERDUE/EXPIRED** : pas de tâche planifiée.
  La vérification d'expiration à l'acceptation est en place et ne dépend PAS d'un
  cron ; un cron resterait un complément.
- **Signature — valeur probante** : signature électronique *simple*. Un OTP
  e-mail renforcerait la preuve de contrôle de la boîte mail (expiration, essais
  limités, renvois limités, usage unique) sans se substituer aux protections de
  version et de consentement déjà ajoutées. Non implémenté (choix à acter).
- **Paiement en ligne** : confirmation manuelle = fonctionnement **voulu** du
  produit (pas une anomalie). Aucun PSP ajouté.

## 6. Validation exécutée

Voir la section « Résultats » du rapport de mission (lint, typecheck, tests sur
base isolée, tests de régression, build de production `hostinger:build`).
