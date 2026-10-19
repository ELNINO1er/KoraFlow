# Tests & CI — contrainte de base partagée

## Contexte
La suite comprend des **tests d'intégration** qui frappent une vraie base
PostgreSQL. Chaque fichier de test s'exécute dans son propre worker (processus),
mais **tous partagent la même base**. Les données sont isolées par organisation
(chaque test crée son org + un suffixe unique), il n'y a donc pas de collision de
données entre fichiers.

## Symptôme observé
Sous **très forte parallélisation de fichiers** (~45 workers simultanés sur une
seule instance Postgres), un test lourd (`e2e-flow`) pouvait échouer de façon
**intermittente**. Reproduit : échec aléatoire en parallèle total, **toujours
vert** en exécution sérialisée.

## Cause (diagnostiquée, pas masquée)
Ce n'est **pas une course applicative sur les données** : les orgs/suffixes sont
uniques, et le même test passe systématiquement seul ou en sérialisé. Il s'agit
d'une **contention de ressources** sur la base partagée — pression sur les
connexions et échecs de sérialisation PostgreSQL transitoires (`40001`/P2034)
quand des dizaines de transactions `Serializable` concurrentes se chevauchent.

## Corrections
1. **Robustesse applicative (réelle)** : les transactions sérialisables
   (facturation idempotente, paiements, archivage) **rejouent** sur conflit
   `P2034`, désormais jusqu'à **5 tentatives**
   (`src/server/repositories/*serializableTransaction`). C'est le bon
   comportement y compris en production.
2. **CI — borne de parallélisme de la base partagée** : la suite d'intégration
   se lance avec :

   ```sh
   DATABASE_URL="postgres://…/koraflow_test" npx vitest run --no-file-parallelism
   ```

   > La version de vitest du dépôt (5.0.1) n'expose pas `poolOptions`
   > (ni en config, ni en flag CLI — `--poolOptions…` renvoie `Unknown option`).
   > `--no-file-parallelism` est le levier supporté. Les tests **unitaires purs**
   > (sans base) peuvent tourner en parallèle sans contrainte.

Ce choix **n'est pas** un contournement d'une course de données : il borne une
ressource partagée (la base) explicitement et de façon documentée, en complément
du durcissement applicatif ci-dessus.

## Amélioration future (facultative)
Isolation totale par un **schéma PostgreSQL dédié par worker** (migrations
appliquées par schéma au démarrage), ce qui permettrait la parallélisation
complète. Non retenu ici pour le coût (20+ migrations × N workers).

## Rappel environnement de test isolé
- Base dédiée (`koraflow_test`), jamais la base de dev ni la prod.
- Stockage local isolé (répertoire temporaire) pour les tests d'archivage/import.
