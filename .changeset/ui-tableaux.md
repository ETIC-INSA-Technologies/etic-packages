---
"@etic-insa/ui": minor
---

Tableaux : `useDataTable` filtre, trie et pagine côté client. `paginationClient` découpe la liste en pages de 25 lignes, que `DataTablePagination table={table}` pilote et que `DataTableCount` (ou le `compteur` de `DataTableToolbar`) compte avec `{ table }`. `filtreGlobal` cherche sans casse ni accents, `filtresColonnes` applique le `filterFn` de chaque colonne, et le tri `sortFn: "texteFr"` suit l'ordre alphabétique français (`comparerFr`, exporté avec `normaliserRecherche`). Un changement de filtre ou de tri ramène à la première page ; une suppression garde la page courante. Les tableaux paginés côté serveur ne changent pas.

`DataTable` accepte `requete` (le résultat de `useQuery`) : en échec, le `QueryErrorBanner` (« Réessayer ») s'affiche au-dessus du tableau, sans état vide qui le contredise. Les colonnes gardent leur largeur quand le tableau se vide. Quand une ligne qui avait le focus disparaît, quelle que soit la commande (corbeille, menu, dialogue), le tableau rend le focus à la ligne voisine, sinon à lui-même. Nouveaux : `dataTableActionsColumn` (colonne « Actions » prête à l'emploi, `enableHiding` pour la rendre masquable), `DataTableCellLink` (titre de ligne en lien, routeur compris, ou en bouton) et `table.options.meta.deselectionner(ids)` (retirer quelques lignes de la sélection). `focaliserTableau` est exporté.

`DataTableViewOptions` et `DataTableBulkActions` servent aussi un tableau rendu à la main, sans `useDataTable` : `colonnes` et les options de colonnes de `useDataTable` (`visibiliteColonnes`, `ordreColonnes` et leurs `on…Change`) pour l'un ; `nombre`, `onToutDeselectionner` et `racine` pour l'autre.

`useColumnPrefs` et `usePersistedState` (sous la portée `PorteeStockageLocal`) gardent dans le navigateur, par personne, les colonnes d'une liste et un réglage simple. Les clés et le format sont ceux d'ETIC Members : ses réglages sont repris tels quels. `prefs.optionsTableau` s'étale dans `useDataTable` comme dans `DataTableViewOptions`.

Correctifs :

- L'en-tête d'un tableau ne se surligne plus au survol.
- La recherche de `DataTableToolbar` écarte les gestionnaires de mots de passe (`NO_AUTOFILL`) et accepte des attributs (`recherche.attributs`).
- Une case verrouillée (ligne non sélectionnable, dernière colonne du sélecteur) reste lisible au lieu d'être estompée.
- La zone tactile de la colonne de sélection ne déborde plus sur la colonne suivante.
- `DeleteButton` accepte `size`, et sa corbeille est le `TooltipButton destructif`.
