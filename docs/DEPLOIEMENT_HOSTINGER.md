# Déploiement Alymero sur Hostinger

Cette cible utilise l'hébergement Node.js managé de Hostinger, une base MySQL
Hostinger et un stockage privé compatible S3 (Supabase à ce jour). Aucun VPS n'est requis.

## Paramètres de compilation

- Cadre : `Next.js`
- Branche : `main`
- Node.js : `24.x`
- Répertoire racine : `./`
- Commande de compilation : `npm run hostinger:build`
- Commande de démarrage : `npm run start`

La commande Hostinger applique les migrations Prisma avant de compiler. Les
migrations doivent donc rester rétrocompatibles avec la version encore en ligne.

## Services externes requis

1. Créer une base MySQL dans hPanel (Sites web → Bases de données), puis renseigner
   `DATABASE_URL="mysql://utilisateur:mot-de-passe@hôte:3306/base"` (mot de passe encodé
   pour URL). Choisir la collation `utf8mb4_unicode_ci`.
2. Créer un projet Supabase pour le stockage uniquement, dans une région proche des utilisateurs.
3. Créer un bucket privé `alymero-private`.
4. Activer le protocole S3 Supabase et générer une paire de clés réservée au serveur.
5. Authentifier `alymero.com` dans Brevo, puis créer une clé SMTP.

Les clés Supabase S3 donnent accès à tous les objets du stockage : elles restent
exclusivement dans les variables d'environnement Hostinger et ne doivent jamais
être copiées dans GitHub ou dans le navigateur de l'application.

## Variables Hostinger

Les valeurs suivantes ne sont pas secrètes :

```dotenv
NODE_ENV=production
APP_URL=https://alymero.com
BETTER_AUTH_URL=https://alymero.com
DEFAULT_LOCALE=fr
DEFAULT_CURRENCY=XOF
SMTP_HOST=smtp-relay.brevo.com
SMTP_PORT=587
SMTP_SECURE=false
EMAIL_FROM=Alymero <no-reply@alymero.com>
STORAGE_DRIVER=database
```

Avec `STORAGE_DRIVER=database`, les fichiers privés (logos, PDF archivés,
imports) sont rangés dans la table `private_file` de la base MySQL : aucun
service externe, et ils sont sauvegardés et restaurés avec la base. Les
variables `PRIVATE_UPLOAD_DIR` et `S3_*` deviennent inutiles et peuvent être
supprimées. Le pilote `s3` reste disponible pour un stockage objet externe.

Les valeurs suivantes sont des secrets à saisir uniquement dans Hostinger :

- `DATABASE_URL`
- `BETTER_AUTH_SECRET` (au moins 32 octets aléatoires)
- `SMTP_USER`
- `SMTP_PASSWORD`
- `S3_ENDPOINT`, `S3_REGION`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`
  (uniquement avec `STORAGE_DRIVER=s3`)

## Contrôles après déploiement

1. Vérifier `/api/health` en HTTPS.
2. Créer un compte avec une adresse de test et confirmer l'e-mail reçu.
3. Vérifier connexion, déconnexion et récupération du mot de passe.
4. Envoyer puis télécharger un document privé autorisé.
5. Vérifier qu'un utilisateur d'une autre organisation reçoit un refus.
6. Contrôler les journaux Hostinger sans y faire apparaître de secret.

## Reprise des données depuis PostgreSQL (une seule fois)

L'ancienne base doit être active (projet Supabase repris). La base MySQL doit être
vide et avoir reçu les migrations. Autoriser votre adresse IP dans « MySQL distant »
de hPanel le temps de la copie, puis retirer cet accès.

```bash
DATABASE_URL="mysql://…" npx prisma migrate deploy
SOURCE_DATABASE_URL="postgresql://…" TARGET_DATABASE_URL="mysql://…" npx tsx scripts/copy-postgres-to-mysql.ts
```

La source n'est que lue, et la copie s'annule entièrement à la moindre erreur.
Les anciennes migrations PostgreSQL restent dans `prisma/migrations-postgres-archive/`.
