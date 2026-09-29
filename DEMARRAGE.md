# Démarrer KoraFlow

Guide de lancement en local et accès de test (super administrateur + utilisateur).

## 1. Prérequis (une seule fois)

- **Docker Desktop** (lancé)
- **Node.js 20+**

Vérifier : `node -v` et `docker -v` répondent.

## 2. Lancer le projet

Dans un terminal, à la racine du projet :

```bash
docker compose up -d      # PostgreSQL (port 5433) + Mailpit (port 8025)
npm run dev               # http://localhost:3000
```

### Première installation (avant `npm run dev`)

```bash
copy .env.example .env    # puis renseigner BETTER_AUTH_SECRET
npm install
npm run db:migrate        # applique toutes les migrations
npm run db:seed           # données de démonstration
```

Générer un secret pour `.env` :

```bash
node -e "console.log(require('crypto').randomBytes(32).toString('base64'))"
```

### Les fois suivantes

```bash
docker compose up -d
npm run dev
```

## 3. URL utiles

| Élément | URL |
|---|---|
| Landing page (visiteur non connecté) | http://localhost:3000 |
| Connexion / Inscription | `/login` · `/register` |
| Console super-admin | http://localhost:3000/admin |
| Mailpit (tous les e-mails de test) | http://localhost:8025 |
| Sonde de santé | http://localhost:3000/api/health |

> ⚠️ Si vous êtes **déjà connecté**, la racine `/` redirige vers `/dashboard`.
> Ouvrez la landing en **navigation privée** pour la voir.
>
> ⚠️ Tous les e-mails (vérification, invitations, réinitialisation) sont
> capturés par **Mailpit** (http://localhost:8025) — aucun envoi réel.

## 4. Accès SUPER ADMIN (plateforme)

- **E-mail :** `bleu@demo.koraflow.test`
- **Mot de passe :** `MotDePasse123!`

Ce compte est **administrateur de plateforme** *et* **propriétaire** de
l'organisation « Bleu ».

Après connexion : menu utilisateur (en haut à droite) → **« Console plateforme »**,
ou aller directement sur **`/admin`**.

Pouvoirs : voir toutes les organisations et utilisateurs, suspendre / supprimer,
créer / supprimer un compte, réinitialiser un mot de passe, **se connecter en
tant que** (impersonation), éditer les organisations, journal d'audit global.

Promouvoir **n'importe quel compte existant** en super-admin :

```bash
npm run admin:grant -- email@exemple.com          # accorder
npm run admin:grant -- email@exemple.com --revoke # retirer
```

## 5. Accès UTILISATEUR (membre d'une organisation)

### A. Créer son propre compte (le plus simple)

1. Aller sur `/register` → nom, e-mail, mot de passe (≥ 8 caractères).
2. Ouvrir **Mailpit** (http://localhost:8025) → cliquer le lien de **vérification**.
3. On arrive sur « Créer votre entreprise » → on devient **propriétaire (OWNER)**.

### B. Être invité dans une organisation existante

1. Connecté en OWNER → menu **Équipe** (`/equipe`) → **Inviter** (e-mail + rôle).
2. L'invitation arrive dans **Mailpit** → lien `/invitations/[token]`.
3. La personne s'inscrit avec **exactement le même e-mail**, vérifie via Mailpit,
   puis **accepte** l'invitation → elle rejoint l'organisation avec son rôle.

> ⚠️ Le compte du seed `proprietaire@demo.koraflow.test` **n'a pas de mot de
> passe** (créé sans identifiants) et n'est **pas connectable**. Utiliser
> `bleu@demo.koraflow.test` ou créer son propre compte.

## 6. Tester en tant que CLIENT (sans compte)

Les clients n'ont pas besoin de compte : ils reçoivent des **liens publics
sécurisés** (par jeton), copiables depuis les fiches internes.

- Portail client : `/portail/[token]`
- Devis : `/q/[token]` · Contrat : `/c/[token]` · Facture : `/i/[token]`
- Formulaire public de démo : `/f/demande-devis-demo`
- Réservation de rendez-vous de démo : `/rdv/appel-decouverte-demo`

## 7. Dépannage

| Besoin | Commande / action |
|---|---|
| Voir les e-mails | http://localhost:8025 |
| Vérifier la base | http://localhost:3000/api/health → `{"status":"ok","db":"up"}` |
| Explorer la base | `npm run db:studio` |
| Mot de passe oublié | lien sur `/login` → e-mail Mailpit → `/reinitialiser-mot-de-passe` |
| Repartir de zéro (⚠️ efface tout) | `npm run db:reset`, puis recréer un compte via `/register` |
| Docker ne répond pas | ouvrir Docker Desktop et attendre « running » |
| Port 3000 occupé | fermer l'autre process (l'app peut basculer sur 3001) |

## En résumé

1. `docker compose up -d` puis `npm run dev`
2. **Landing** : `/` (en navigation privée)
3. **Super-admin** : `bleu@demo.koraflow.test` / `MotDePasse123!` → `/admin`
4. **Utilisateur** : `/register` (+ vérification Mailpit) ou invitation via `/equipe`
5. Tous les e-mails → **http://localhost:8025**
