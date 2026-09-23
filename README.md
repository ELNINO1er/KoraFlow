# KoraFlow

**Plateforme SaaS de gestion commerciale tout-en-un** pour indépendants, agences et PME d'Afrique francophone (marché initial : Côte d'Ivoire).

> _Votre entreprise, parfaitement orchestrée._

KoraFlow centralise le parcours commercial complet, **de la première demande du prospect jusqu'au paiement et à la livraison du projet** : CRM, formulaires publics, rendez-vous, devis, contrats (signature électronique simple), factures, paiements, projets, portail client, tableau de bord, équipe et notifications — le tout **multi-tenant** et isolé par organisation.

---

## Sommaire

- [Stack technique](#stack-technique)
- [Prérequis](#prérequis)
- [Démarrage rapide](#démarrage-rapide)
- [Scripts](#scripts)
- [Architecture](#architecture)
- [Multi-tenant & sécurité](#multi-tenant--sécurité)
- [Parcours fonctionnel](#parcours-fonctionnel)
- [Tests & intégration continue](#tests--intégration-continue)
- [Limites connues & backlog](#limites-connues--backlog)

---

## Stack technique

| Domaine | Choix |
|---|---|
| Framework | **Next.js 16** (App Router, Server Components, Server Actions) + **React 19** |
| Langage | **TypeScript strict** |
| Style / UI | **Tailwind CSS v4** (tokens en CSS via `@theme`), composants type shadcn/ui, Lucide, Recharts |
| Base de données | **PostgreSQL 16** |
| ORM | **Prisma 7.10** (figé volontairement — voir ci-dessous) via **driver adapter `@prisma/adapter-pg`** |
| Authentification | **Better Auth** (e-mail/mot de passe, vérification, MFA TOTP) |
| PDF | `@react-pdf/renderer` (runtime Node) |
| E-mail | `nodemailer` → **Mailpit** en développement |
| Tests | **Vitest** (unitaires + intégration multi-tenant sur base réelle) |
| CI/CD | **GitHub Actions** (PostgreSQL de service) |
| Conteneurs | **Docker Compose** (PostgreSQL + Mailpit) |

### Décisions structurantes

- **Prisma 7.10 figé.** Le tag npm `latest` pointe sur une RC 8 (« Prisma Developer Platform », CLI incompatible). On reste sur l'ORM classique stable. En Prisma 7 : l'URL de connexion vit dans `prisma.config.ts` (CLI/Migrate) et le `PrismaClient` runtime utilise un **driver adapter** `pg`.
- **Montants** stockés en **entiers**, dans la plus petite unité de la devise (ISO 4217), formatés via `Intl.NumberFormat`. Multi-devise dès le départ (défaut **XOF / FCFA**).
- **Horodatage UTC.** ⚠️ La logique de créneaux de rendez-vous suppose actuellement **UTC+0** (Africa/Abidjan) ; les fuseaux à décalage sont un chantier ultérieur.
- **Paiements MVP à validation manuelle** : le client déclare son paiement, un responsable le valide (aucune confirmation automatique). Abstraction prête pour un agrégateur (CinetPay/Wave/Orange Money…).

---

## Prérequis

- **Node.js** ≥ 22 (développé sous Node 24)
- **Docker** + Docker Compose (PostgreSQL & Mailpit)
- **npm**

---

## Démarrage rapide

```bash
# 1. Services locaux (PostgreSQL sur le port hôte 5433, Mailpit sur 8025)
docker compose up -d

# 2. Variables d'environnement
cp .env.example .env
#   Générer un secret : openssl rand -base64 32  -> BETTER_AUTH_SECRET

# 3. Dépendances
npm install            # (postinstall lance prisma generate)

# 4. Base de données
npm run db:migrate     # applique les migrations
npm run db:seed        # organisation + propriétaire de démonstration

# 5. Développement
npm run dev            # http://localhost:3000
```

Services de développement :
- **Application** : http://localhost:3000
- **Mailpit** (e-mails capturés, aucun envoi réel) : http://localhost:8025

> Le parcours d'inscription passe par une **vérification d'e-mail** : après inscription, récupérez le lien de confirmation dans Mailpit.

---

## Scripts

| Script | Rôle |
|---|---|
| `npm run dev` | Serveur de développement |
| `npm run build` / `npm start` | Build de production / démarrage |
| `npm run lint` | ESLint |
| `npm run typecheck` | `tsc --noEmit` |
| `npm test` | Vitest (unitaires + intégration) |
| `npm run db:migrate` | `prisma migrate dev` |
| `npm run db:seed` | Données de démonstration |
| `npm run db:studio` | Prisma Studio |
| `npm run db:reset` | Réinitialise la base |

---

## Architecture

Découpage en **couches** (l'UI n'appelle jamais Prisma directement) :

```
UI (Server/Client Components)  →  Server Actions / Route Handlers
        ↓  (validation Zod aux frontières)
   Permissions (matrice RBAC vérifiée côté serveur)
        ↓
   Services (logique métier, transactions, audit)
        ↓
   Repositories (accès données, TOUJOURS filtrés par organizationId)
        ↓
   Prisma  →  PostgreSQL      Intégrations isolées : PDF, e-mail, paiement
```

Structure du dépôt :

```
src/
  app/
    (auth)/            connexion, inscription
    (dashboard)/       espace authentifié (shell + pages)
    f/[slug]/          formulaire public
    rdv/[slug]/        réservation publique
    q|c|i/[token]/     consultation/action publique (devis, contrat, facture)
    portail/[token]/   portail client unifié
    api/               route handlers (auth, PDF)
  components/          ui/, layout/, dashboard/
  features/            actions & composants par domaine
  server/
    auth/              Better Auth + AuthContext (résolution session→org→rôle)
    repositories/      accès données scopé multi-tenant
    services/          logique métier + permissions + audit
    pdf/ integrations/ PDF, e-mail
  lib/                 validation/, security/, formatting/, constants/, ...
prisma/                schema.prisma, migrations/, seed.ts
```

---

## Multi-tenant & sécurité

- **Isolation par `organizationId`** appliquée dans **chaque requête** de la couche repository ; les mutations utilisent des `updateMany`/`deleteMany` scopés (id + organizationId). Aucun accès inter-organisation possible.
- **Tests d'isolation automatiques** (~33) : un membre de l'organisation A ne peut jamais lire/modifier/supprimer les données de B — ils échoueraient si le filtre était retiré.
- **RBAC** : 7 rôles, matrice de permissions typée et vérifiée côté serveur (`assertCan`).
- **Journal d'audit** sur les opérations sensibles.
- **En-têtes de sécurité** (`next.config.ts`) : `nosniff`, `X-Frame-Options`, `Referrer-Policy`, `Permissions-Policy`, HSTS.
- **Content-Security-Policy** par requête avec **nonce** (`src/middleware.ts`).
- **Rate-limiting** sur les écritures publiques (formulaires, déclaration de paiement, réservation).
- **Aucun secret dans le dépôt** : `.env` est ignoré, `.env.example` ne contient aucune valeur secrète.
- **Signature de contrat** : électronique **simple** (consentement + horodatage + IP + empreinte **SHA-256** du contenu) — **jamais présentée comme « qualifiée »**.
- **Paiement** : jamais confirmé automatiquement (validation manuelle par un responsable).

---

## Parcours fonctionnel

```
Formulaire public / Réservation RDV
        → Prospect (créé automatiquement)
        → Client
        → Devis  → (portail) accepté par le client
        → Contrat généré → signé (SHA-256)
        → Facture → paiement déclaré → validé → Payée
        → Projet créé automatiquement (étapes + tâches + progression)
```

Le **portail client** (`/portail/[token]`) agrège devis, contrats, factures, projets et rendez-vous du client, avec accès direct aux actions (accepter un devis, signer un contrat, déclarer un paiement).

Compte de démonstration (après `db:seed` puis inscription/vérification) : voir Mailpit pour le lien de vérification.

---

## Tests & intégration continue

```bash
npm test          # Vitest : logique pure (totaux devis, créneaux RDV, mapping…)
                  #          + intégration multi-tenant sur PostgreSQL réel
```

La **CI GitHub Actions** (`.github/workflows/ci.yml`) démarre un PostgreSQL de service puis enchaîne :
`npm ci → prisma migrate deploy → generate → lint → typecheck → test → build`.

---

## Limites connues & backlog

- **Fuseaux horaires** des rendez-vous : MVP en UTC+0 (Abidjan).
- **Notifications** : in-app uniquement (e-mails aux membres à ajouter).
- **RLS PostgreSQL** (défense en profondeur) : prévu en complément de l'enforcement applicatif.
- **Intégrations externes** à brancher : agrégateur de paiement (CinetPay/Wave/Orange Money), SMS/WhatsApp, connecteur **FNE** (facture normalisée DGI).
- **Vulnérabilités npm** : 4 « high » transitives via le **CLI Prisma** (dev-dependency, `mysql2`/`deepmerge-ts`) — non exploitables (PostgreSQL via `pg`, CLI hors runtime) ; ne pas `npm audit fix --force` (rétrograderait Prisma).

---

> Nom, marque et domaine « KoraFlow » **provisoires** — une recherche juridique et commerciale (INPI/OAPI, disponibilité de domaine) reste à mener avant tout lancement officiel.
