---
"@etic-insa/ui": minor
---

`useListUrlState` rend aussi `pagination` (la page aux noms des options de
`useServerPagination` : `useServerPagination({ ...liste.pagination, requete })`) et
`selection` (l'URL sans la page ni la vue, qui ne change qu'avec les lignes retenues) ; son
option `tiroir` déclare le paramètre du tiroir de détail, rendu en `tiroir: { id, onIdChange }`
pour `useDetailSheet`. `creerEtatListeRouteur(useSearchParams)` le branche une fois pour toutes
sur le routeur de l'application (le résultat porte alors `params`), sans que la bibliothèque en
importe aucun.
