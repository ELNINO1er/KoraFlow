# Sécurité — KoraFlow

Ce document décrit le modèle de sécurité de KoraFlow et la feuille de route de durcissement. Approche : **OWASP** et **Secure by Design**.

## Isolation multi-tenant (état actuel)

L'isolation entre organisations est appliquée **au niveau applicatif**, dans la couche `repositories` :

- Chaque fonction reçoit `organizationId` et l'inclut dans **toutes** les clauses `where`.
- Les mutations passent par `updateMany`/`deleteMany` scopés (`id` **et** `organizationId`) : une tentative inter-organisation n'affecte **aucune** ligne.
- Le contexte d'autorisation (`AuthContext`) est résolu côté serveur : session → appartenance (revérifiée en base) → rôle → permissions.
- **~33 tests d'intégration** vérifient sur une base réelle qu'une organisation ne peut jamais lire/modifier/supprimer les données d'une autre. Ils deviendraient rouges si le filtre était retiré.

## Contrôle d'accès (RBAC)

- 7 rôles ; matrice de permissions **typée** et vérifiée côté serveur via `assertCan(role, permission)`.
- Les vérifications sont dans la couche `services`, jamais uniquement dans l'UI.

## En-têtes & CSP

- En-têtes (`next.config.ts`) : `X-Content-Type-Options: nosniff`, `X-Frame-Options: SAMEORIGIN`, `Referrer-Policy`, `Permissions-Policy`, **HSTS**.
- **Content-Security-Policy** par requête avec **nonce** (`src/middleware.ts`), `strict-dynamic`, `object-src 'none'`, `frame-ancestors 'self'`. `unsafe-eval`/`ws:` uniquement en développement (HMR).

## Autres mesures

- **Rate-limiting** (en mémoire) sur les écritures publiques : soumission de formulaire, déclaration de paiement, réservation de rendez-vous.
- **Secrets** : jamais dans le dépôt (`.env` ignoré, `.env.example` sans valeur). `BETTER_AUTH_SECRET` requis.
- **Authentification** : Better Auth (e-mail/mot de passe, vérification d'e-mail, MFA TOTP), cookies sécurisés.
- **Signature de contrat** : électronique **simple** (consentement explicite + horodatage + IP + empreinte **SHA-256** du contenu figé). **Jamais** présentée comme « qualifiée » au sens réglementaire.
- **Paiement** : jamais confirmé automatiquement — validation **manuelle** par un responsable (une redirection navigateur ne vaut pas confirmation).
- **Journal d'audit** sur les opérations sensibles ; aucune donnée sensible dans les pages d'erreur (loguées côté serveur/client).
- **Sonde de santé** : `GET /api/health` (connexion DB), sans donnée sensible.

## Feuille de route — RLS PostgreSQL (défense en profondeur)

Objectif : ajouter une **seconde barrière** au niveau base, en complément de l'enforcement applicatif.

⚠️ **Changement structurant et « tout ou rien ».** Pour être efficace, RLS doit être **forcé** (`FORCE ROW LEVEL SECURITY`) sur les tables porteuses de `organizationId`. Dès lors, **chaque** requête doit poser le contexte d'organisation, sinon elle ne renvoie rien.

Plan d'implémentation (à réaliser avec vérification de bout en bout) :

1. **Migration SQL** : `ENABLE`/`FORCE ROW LEVEL SECURITY` + politique par table :
   `USING (organizationId = current_setting('app.current_org', true))`.
2. **Contexte par requête** : `AsyncLocalStorage` portant l'`organizationId` courant, positionné dans `resolveSession` (flux authentifiés) et dans les services publics par jeton (org résolue depuis le jeton).
3. **Extension Prisma** (`$extends`) : enrober chaque opération dans une transaction posant `SET LOCAL app.current_org = <org>` avant la requête.
4. **Voie de contournement contrôlée** pour la migration, le seed et les tests d'intégration (qui insèrent des données hors requête HTTP) — ex. rôle dédié ou variable de bypass explicite.
5. **Vérification** : tests d'intégration prouvant que (a) avec contexte, les requêtes fonctionnent et restent isolées, (b) sans contexte, l'accès est bloqué ; puis vérification navigateur que l'application fonctionne toujours.

Tant que ces étapes ne sont pas toutes réunies et vérifiées, RLS n'est **pas** activé, afin de ne pas casser l'application, le seed et la suite de tests.

## Signalement d'une vulnérabilité

Merci de signaler toute vulnérabilité de manière responsable à l'équipe (canal privé), sans divulgation publique préalable.
