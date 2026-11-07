---
"@etic-insa/ui": minor
---

Composants, hooks et formats venus des applications :

- Tiroirs : `taille` de `SheetContent` (`sm` à `xl`, tout l'écran sous 640 px) et `SheetBody`,
  seul à défiler ; `DetailSheet`, tiroir de détail d'une liste (chargement, introuvable,
  contenu gardé pendant la fermeture), piloté par `useDetailSheet` (identifiant gardé dans
  l'URL, dernier élément ouvert retenu).
- Listes : `useColumnPrefs` masque désormais les colonnes indisponibles (`disponibles`), qui
  restaient affichées ; options `affichees` (colonnes imposées par la vue) et `mobile` (seules
  colonnes affichées sur téléphone). `DataTableViewOptions` n'est plus rendu sans colonne à
  régler. `filtresSecondaires` de `DataTableToolbar` : filtres moins courants derrière « Plus de
  filtres ». `useServerPagination` (compteur, pagination, retour à la dernière page),
  `useServerSorting`, `useDebouncedSearch` et `FilteredEmptyState`.
- Navigation et en-têtes : `badge` d'une entrée d'`AppShell` (pastille, point sur l'icône barre
  repliée) ; `NavTabs`, onglets qui sont des liens ; `DetailMeta` et `DetailMetaLink`, ligne
  d'informations d'une fiche aux points jamais orphelins ; `ExternalLink` et
  `DropdownMenuExternalLink`, liens vers un nouvel onglet, annoncés.
- Formulaires et blocs : `SelectField`, `SelectedFile`, `SubSection`, `CodeBlock`.
- Hooks : `useFreshDialog`, `useLoadOnOpen`, `useSaveByKey`.
- Formats : `formaterNombre`, `formaterMontant`, `formaterPourcentage`, `formaterDureePrecise`,
  `formaterHeure`, `capitaliser`, `initiales`.
