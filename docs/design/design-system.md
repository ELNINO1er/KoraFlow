# Alymero — Design System

Identité : **The Living Orchestra** — l'entreprise en mouvement. Toute l'interface
présente l'activité comme une orchestration coordonnée. Le fil conducteur est la
**Kora Line** (terracotta) : Demande → Prospect → Rendez-vous → Devis → Contrat →
Paiement → Projet.

## Principe d'animation
- **Landing** : expressive, cinématographique (Motion + SVG, Kora Line).
- **Application / portail / admin** : sobre, rapide, fonctionnel (150–300 ms).
- Un seul **moment fort** par section. On n'anime que `transform` / `opacity`.
- Toujours respecter `prefers-reduced-motion` + bascule « Réduire les animations »
  (`MotionPreferencesProvider`).

## Tokens (source unique : `src/app/globals.css`)

### Couleurs sémantiques (clair + sombre)
`background, surface, foreground, muted, muted-foreground, secondary(-foreground),
border, input, ring, primary(-foreground), accent(-foreground), success, warning,
danger (+ -foreground)`. Marque : ink `#12263A`, terracotta `#C8553D`, ivoire
`#FAF7F2`, succès `#2F855A`, gris `#667085`, bordure `#E4E7EC`, danger `#D92D20`,
warning `#F59E0B`. → utilitaires Tailwind : `bg-*`, `text-*`, `border-*`.

### Élévations
`--elevation-1..4` (ombres teintées ink en clair, plus profondes en sombre),
exposées en utilitaires **`shadow-e1` … `shadow-e4`**.

### Mouvement
Courbes : `--ease-out` (entrées), `--ease-in-out` (états), `--ease-emphasized`.
Utilitaires : `ease-brand`, `ease-emphasized`. Durées : `--duration-fast` 150ms,
`--duration-base` 300ms, `--duration-slow` 550ms. Miroir JS : `features/marketing/motion.ts`.

### Z-index (référence)
`--z-raised 10 · --z-sticky 30 · --z-overlay 40 · --z-modal 50 · --z-toast 60`.

### Rayons / typographie
`--radius 0.625rem` (échelle Tailwind `rounded-*`). Titres **Manrope**
(`font-display`), interface **Inter** (`font-sans`).

## Primitives (`src/components/ui`)
Existant : `button, card, input, label, avatar, badge, skeleton, dropdown-menu,
textarea`.
Ajoutées (Radix, accessibles) : **`dialog`, `tabs`, `select`, `toast`**
(+ `ToastProvider`/`useToast`).
Formulaire : **`field`** (label + aide + erreur + aria), **`password-input`**
(afficher/masquer), **`password-strength`** (indicateur 0–4), **`sensitive-action-dialog`**
(impact + justification + chargement + anti double-soumission ; rouge réservé au
réellement destructeur).

Partagés transverses :
- **`native-select`** — sélecteur natif stylé (remplace l'ancien `selectClass`
  dupliqué dans ~8 formulaires). Pour les formulaires : **`field-controls`**
  (`TextField`, `TextareaField`, `SelectField` = Field + contrôle en un).
- **`date-text`** — `<DateText value variant="short|long|datetime|time" utc? />`
  (balise `<time>`, affichage de date cohérent partout).
- **`money`** — `<Money minor currency />` (montant depuis l'entier en plus petite
  unité).
- **`pagination`** — `<Pagination page totalPages makeHref />` (Précédent/Suivant).
- **`copy-button`** — copie presse-papiers avec retour visuel (liens publics).

Règle de cohérence : pour une **date** → `DateText` ; un **montant** → `Money` ;
un **select simple** → `NativeSelect`/`SelectField` ; **jamais** de `Intl.*` ni de
classe de champ recopiée dans une page.

## Mouvement partagé (`src/features/marketing`)
`MotionPreferencesProvider` + `MotionToggleButton`, `Reveal`, `SectionHeading`,
`BrandFlowPath` — fil de marque réutilisable hors landing (auth, etc.).

## Accessibilité (rappel)
HTML sémantique, focus visible, cibles ≥ 44×44 px, labels liés, erreurs annoncées
(`role="alert"`, `aria-describedby`), jamais l'information par la seule couleur,
modales avec piège de focus (Radix), `prefers-reduced-motion`.
