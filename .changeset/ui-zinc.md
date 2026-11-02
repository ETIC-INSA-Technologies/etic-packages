---
"@etic-insa/ui": patch
---

Les neutres du thème (fonds, panneaux, bordures, textes secondaires, anneau de focus et accent
par défaut, barre latérale) passent de la couleur de base `gray` de shadcn, légèrement bleutée, à
la couleur de base `zinc` (registre shadcn, palette `zinc` de Tailwind 4 : gris froid presque
neutre). Les écarts d'ETIC sont gardés et recalculés sur `zinc` : `--page` zinc-50 en clair,
barre latérale blanche en clair, `--muted-foreground` clair un peu plus foncé que zinc-500
(4,64:1 sur `--muted`), `--control-border`, couleurs sémantiques inchangées (tous les contrastes
exigés restent atteints). Rien à faire côté application, sauf si elle surchargeait des neutres :
les recalculer sur `zinc`.

Un tableau se détache toujours de la surface qui le porte : le cadre de `DataTable` passe de
`bg-card` au nouveau jeton `bg-tableau`, qui vaut `--card` sur la page et le fond de la page
(`--page`) dans une `Card` (`SectionCard` comprise), un dialogue, un `AlertDialog`, un tiroir, un
popover ou une `Disclosure` `variante="carte"` (qui porte désormais `data-variante` sur sa racine).
Rien à faire pour `DataTable` ; un cadre de tableau propre à l'application peut prendre
`bg-tableau` au lieu de `bg-card` pour suivre la même règle.
