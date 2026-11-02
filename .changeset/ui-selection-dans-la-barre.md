---
"@etic-insa/ui": minor
---

« Sélectionner les N » passe du bandeau de `DataTable` à la barre `DataTableBulkActions` : cocher
toute la page n'insère plus de ligne au-dessus du tableau, qui ne se décale plus. La barre propose
un bouton compact à côté de son compte (icône et « Sélectionner les 137 », l'icône seule sur
téléphone, nom complet « Sélectionner les 137 personnes ») ; une fois accepté, elle compte le
total et le focus passe à « Tout désélectionner ». Le bandeau
(`[data-slot="data-table-select-all"]`) n'existe plus : un tableau avec `total` mais sans
`DataTableBulkActions` ne propose plus de tout sélectionner. Les props `unite` et `feminin` de
`DataTable` restent, pour l'annonce « Les 137 éléments sont sélectionnés ».
