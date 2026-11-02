---
"@etic-insa/ui": minor
---

Les neutres du thème (fonds, panneaux, bordures, textes secondaires, anneau de focus et accent
par défaut, barre latérale) passent de la couleur de base `gray` de shadcn, légèrement bleutée, à
la couleur de base `zinc` (registre shadcn, palette `zinc` de Tailwind 4 : gris froid presque
neutre), avec exactement les valeurs du preset, contraste faible compris : `--muted-foreground`
redevient zinc-500 (4,39:1 sur `--muted` en clair). Seuls écarts gardés : `--page` (zinc-50 en
clair, `--background` en sombre), barre latérale blanche en clair, `--control-border` (bord des
contrôles non cochés, au moins 3:1), couleurs sémantiques inchangées, `color-scheme`. Rien à
faire côté application, sauf si elle surchargeait des neutres : les recalculer sur `zinc`.

Un tableau se détache de la surface qui le porte : le cadre de `DataTable` passe de `bg-card` au
nouveau jeton `bg-tableau`, qui vaut `--card` sur la page et le fond de la page (`--page`) dans
toute surface de la bibliothèque peinte en `bg-card` ou `bg-popover` — `Card` (`SectionCard`
comprise), `Alert`, dialogue, `AlertDialog`, tiroir, popover, menu déroulant, liste d'un
`Select` ou d'un `Combobox`, `SaveBar`, barre d'actions groupées, barre latérale, `Disclosure`
`variante="carte"` (qui porte désormais `data-variante` sur sa racine). Les lignes gardent le
survol et la sélection de shadcn. Rien à faire pour `DataTable` ; un cadre de tableau propre à
l'application peut prendre `bg-tableau` au lieu de `bg-card` pour suivre la même règle.
