# Console super-admin

La console `/admin` est réservée aux comptes portant `isPlatformAdmin = true`.
Le rôle Better Auth `admin` est synchronisé avec ce drapeau lors des attributions
et retraits d’accès depuis la console.

## Première connexion

Un administrateur sans double authentification est dirigé vers `/admin/security`.
Il configure une application TOTP, conserve ses codes de secours, puis valide un
premier code. Les sessions précédentes sont fermées : il doit se reconnecter avec
son mot de passe et le code de son application. Un code de secours permet de se
connecter si l’application n’est plus disponible.

## Ajouter un administrateur

Dans **Administrateurs → Ajouter un administrateur** :

- **Compte existant** : saisir son e-mail. Un compte suspendu doit être réactivé
  avant d’être promu.
- **Nouveau compte** : saisir nom, e-mail et mot de passe initial d’au moins
  12 caractères. Le destinataire reçoit un e-mail de vérification. Si l’envoi
  échoue, le compte reste créé et l’interface le précise ; la vérification peut
  être redemandée depuis la connexion.

Dans les deux cas, l’opérateur doit confirmer son propre mot de passe et indiquer
un motif. Les comptes créés ne sont pas automatiquement membres d’une entreprise.
Cet accès concerne **toute la plateforme**, et non une seule organisation.

Le menu d’un utilisateur permet également d’accorder ou de retirer cet accès.
Un administrateur ne peut pas retirer son propre accès, se suspendre ou se
supprimer. Un compte administrateur doit perdre ses droits avant sa suppression.
Le dernier propriétaire d’une organisation ne peut pas être supprimé.

## Recherche, corbeille et audit

- Les listes utilisent une pagination serveur de 25 éléments, avec recherche,
  filtres et tri par date. Les filtres sont conservés dans l’URL.
- Le filtre **Corbeille** des organisations permet de retrouver et restaurer les
  organisations archivées. La restauration conserve leur éventuelle suspension.
- La fiche d’un utilisateur présente ses organisations et ses 20 sessions actives
  les plus récentes, sans exposer les jetons de connexion.
- Le journal d’audit se filtre par acteur, organisation, opération et dates UTC.
  Les nouveaux événements contiennent le motif et, lorsque disponible, les
  valeurs avant/après. Les anciens événements ne sont pas enrichis rétroactivement.

Les suspensions, suppressions, changements de droits et sessions de support
demandent un motif et une confirmation par mot de passe. Les sessions de support
durent au maximum 15 minutes et ne permettent pas d’accéder à la console admin.

## Garanties techniques et exploitation

Les mutations du service plateforme et leur journalisation partagent une
transaction PostgreSQL. Un verrou transactionnel commun sérialise les mutations
de cette console pour protéger les derniers propriétaires lors d’opérations
simultanées. Ce verrou ne couvre pas les écritures SQL externes à ce service.

Les routes HTTP `/api/auth/admin/*` sont bloquées : les opérations doivent passer
par les actions serveur de la console et leurs contrôles. Les appels internes au
plugin Better Auth restent disponibles pour les parcours encadrés.

La limitation des tentatives de confirmation utilise le limiteur en mémoire
existant. Pour plusieurs instances, prévoir un compteur partagé.

La journalisation automatique des arguments des actions serveur par Next.js est
désactivée en développement afin de ne pas écrire les mots de passe et codes TOTP
dans le terminal.

Aucune migration supplémentaire n’est nécessaire : les tables d’audit, sessions
et double authentification existent déjà. Le SMTP doit être configuré pour la
vérification des nouveaux comptes.

## Vérification

Exécuter les tests d’intégration uniquement contre une base de test dédiée ayant
reçu les migrations, en définissant explicitement `DATABASE_URL`.

```sh
npm run typecheck
npm run lint
npx vitest run src/lib/admin/query.test.ts src/server/auth/platform.test.ts src/features/admin/actions.test.ts src/server/services/platform-admin.test.ts 'src/app/api/auth/[...all]/route.test.ts'
npm run build -- --webpack
```
