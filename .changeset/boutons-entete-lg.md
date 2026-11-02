---
"@etic-insa/ui": minor
---

Les boutons d'en-tête de page passent à 36 px partout : `PageHeader` comme `DetailHeader`
agrandissent leurs actions sans `size` à leur donner (`Button`, `TooltipButton`, `DeleteButton`
avec `avecTexte`, `ButtonLink` : `default` prend la hauteur de `lg`, `icon` celle d'`icon-lg` ;
une taille plus petite donnée par `size` ou par `className` reste). Les tailles `default` et
`icon` de `buttonVariants` lisent leur hauteur dans `--bouton-hauteur` et `--bouton-icone`
(32 px sans elles), que la zone des actions pose. `tailleActions` vaut désormais `lg` par
défaut, aussi sur `PageHeader` (nouvelle prop) ; `tailleActions="default"` garde 32 px. Côté
application, les `size="lg"` et `tailleActions="lg"` des en-têtes deviennent superflus.
