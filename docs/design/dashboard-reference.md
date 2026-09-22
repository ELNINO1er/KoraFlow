# Référence de design — Tableau de bord (maquette validée)

> Spécification extraite de la maquette fournie par le client (2026-09-22).
> Cible visuelle de l'écran authentifié. À respecter lors de la construction du
> shell applicatif et du tableau de bord.

## Cadre général
- Application « desktop » dans un cadre bleu nuit ; contenu sur fond ivoire/blanc.
- Version **mobile** fournie : mêmes cartes empilées + **bottom-nav** (Accueil, Clients, Devis, Factures, Projets).
- Slogans présents : « Plus loin, ensemble » (sous le logo), « Des idées aux résultats » (bas de sidebar), « Des entreprises plus fortes demain. » (accroche marketing).

## Sidebar (gauche, claire)
- Logo **KoraFlow** en haut + baseline « Plus loin, ensemble ».
- Items avec icônes : Tableau de bord, Clients, Rendez-vous, Devis, Contrats, Factures, Projets.
- Item actif : **pastille terracotta** (fond + icône), texte foncé.
- Bas de sidebar : « Des idées aux résultats » + trait terracotta.

## Barre supérieure
- Champ de **recherche** large et arrondi (« Rechercher un client, un devis, une facture… »).
- **Cloche de notifications** avec badge numérique (ex. 3).
- **Sélecteur d'organisation** : avatar initiale + nom org (« Bleu ») + sous-texte (« Mon entreprise ») + chevron (menu déroulant).

## En-tête de page
- Salutation « **Bonjour {prénom}** » + sous-titre « Voici un aperçu de l'activité de votre entreprise aujourd'hui. »
- À droite : **date du jour** (format long fr, ex. « Mardi 27 mai 2025 ») + micro-accroche.

## Cartes KPI (rangée de 4)
Chaque carte : icône dans une pastille teintée, libellé, **grand nombre**, delta coloré (vert si positif, ex. « +12% ce mois-ci »). Fonds légèrement teintés (bleu, pêche, vert, lavande).
1. **Prospects** — nombre (ex. 248), delta.
2. **Devis en attente** — nombre (ex. 18), delta.
3. **Paiements reçus** — montant **FCFA** (ex. 4 320 000 FCFA), delta.
4. **Projets actifs** — nombre (ex. 7), « +2 nouveaux ».

## Chiffre d'affaires (carte large)
- **Graphique à barres** (bleu nuit), axe mois Jan→Déc, valeurs en FCFA.
- Filtres en pastilles : **7j / 30j / 3m / 12m** (actif = terracotta).

## Activité récente (carte)
- Liste : pastille d'icône colorée + titre + sous-texte + horodatage relatif (« il y a 2 h »).
- Lien « Voir tout → ».
- Événements types : nouveau prospect, RDV confirmé, devis envoyé, paiement reçu, projet mis à jour.

## Projets en cours (rangée de cartes)
- Icône + nom projet + sous-texte client + **barre de progression** colorée + « Livraison prévue : {date} ».

## Statut des paiements Mobile Money (carte)
- Lignes par opérateur : **Wave** (W, teal), **Orange Money** (O, orange), **MTN** (M, jaune).
- Montant FCFA + badge vert « Confirmés » + nombre de transactions.

## Notes d'implémentation honnêtes
- Beaucoup de ces chiffres proviennent de données créées aux sprints ultérieurs
  (CRM, devis, paiements). Lors de la 1re construction du dashboard, les métriques
  non encore disponibles seront affichées via **états vides** ou **données de démo
  clairement étiquetées** — jamais présentées comme réelles.
- Graphiques : Recharts (déjà prévu). Icônes : Lucide. Formats FCFA via `Intl.NumberFormat`.
