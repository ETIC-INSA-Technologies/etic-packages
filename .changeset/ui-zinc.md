---
"@etic-insa/ui": minor
---

Les neutres du thème (fonds, panneaux, bordures, textes secondaires, anneau de focus et accent
par défaut, barre latérale) passent de la couleur de base `gray` de shadcn, légèrement bleutée, à
la couleur de base `zinc` (registre shadcn, palette `zinc` de Tailwind 4 : gris froid presque
neutre). Les écarts d'ETIC sont gardés et recalculés sur `zinc` : `--page` zinc-50 en clair,
barre latérale blanche en clair, `--muted-foreground` clair plus foncé que zinc-500 (5,74:1 sur
`--muted`, au moins 5:1 sur les fonds de tableau), `--control-border`, couleurs sémantiques
inchangées. Rien à faire côté application, sauf si elle surchargeait des neutres : les
recalculer sur `zinc`.

Un tableau se détache toujours nettement de la surface qui le porte (au moins 1,08:1, dans les
deux thèmes) : le cadre de `DataTable` passe de `bg-card` au nouveau jeton `bg-tableau`, qui
vaut `--tableau` sur la page et `--tableau-surface` dans toute surface de la bibliothèque peinte
en `bg-card` ou `bg-popover` — `Card` (`SectionCard` comprise), `Alert`, dialogue,
`AlertDialog`, tiroir, popover, menu déroulant, liste d'un `Select` ou d'un `Combobox`,
`SaveBar`, barre d'actions groupées, barre latérale, `Disclosure` `variante="carte"` (qui porte
désormais `data-variante` sur sa racine). En clair, le tableau est un cran plus sombre que son
support ; en sombre, il prend `--card` sur la page et la page dans une surface. Les lignes de
`DataTable` se surlignent au survol en `bg-tableau-survol` et, sélectionnées, en
`bg-tableau-selection` (nouveaux jetons, relatifs au fond du tableau) au lieu de `bg-muted/50` et
`bg-muted`, qui ne se voyaient presque plus. Rien à faire pour `DataTable` ; un tableau propre à
l'application prend `bg-tableau` pour son cadre et
`hover:bg-tableau-survol data-[state=selected]:bg-tableau-selection` pour ses lignes. Limite
connue, en clair : un `--primary-text` d'application calibré au plus juste sur `--muted`, et la
teinte `bg-destructive/10`, passent un peu sous 4,5:1 sur les lignes les plus sombres.
