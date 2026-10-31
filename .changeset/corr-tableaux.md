---
"@etic-insa/ui": minor
---

`DataTable` : lignes dépliables, sur le modèle de TanStack et de shadcn — colonne `dataTableExpandColumn` (chevron avec `aria-expanded` et `aria-controls`), détail rendu sous la ligne par `rendreDetail`, et dans `useDataTable` `ligneDepliable`, `uneSeuleLigneDepliee`, `lignesDepliees`/`onLignesDeplieesChange`. Le tableau annonce le tri choisi et le chargement, garde le focus quand un contrôle disparaît (pagination en bout de liste, « Réinitialiser », bandeau et barre de sélection), et ne redessine que la ligne dont la sélection change.
