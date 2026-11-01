---
"@etic-insa/ui": minor
---

Utilitaires et hooks communs à la suite, exportés par `@etic-insa/ui` :

- accords et nombres : `compte(1234, "ligne")` → « 1 234 lignes » (0 et 1 au singulier), `accorde` (le mot seul, pluriel irrégulier en option), et les helpers que la famille `DataTable` employait déjà en interne, `nombreFr`, `uniteAccordee`, `participe` (type `Unite`) ;
- octets et durées : `formaterOctets` (« 1,5 Ko »), `formaterDuree` (« 3 j 4 h »), `formaterDureeArrondie` (« 3 j »), `formaterAnciennete` (« il y a 3 j 4 h », « à l'instant ») ;
- dates en français : `formaterDate` (« 05 juillet 2026 » ; une date sans heure garde son jour à l'ouest de Greenwich), `formaterDateHeure`, `formaterHorodatage`, `formaterDateHeureLongue`. Une valeur absente rend « — » ou le repli donné, une valeur illisible est rendue telle quelle ;
- `lireDateIso` et `ecrireDateIso` : une date sans heure de l'API (`AAAA-MM-JJ`) vers la `Date` du `DatePicker` et retour, en heure locale, sans décalage d'un jour ;
- `normaliser` (sans accents ni casse) et `correspondance(recherche)(...textes)` pour filtrer une liste locale ;
- `NO_AUTOFILL`, les attributs qui écartent les gestionnaires de mots de passe d'un champ ;
- `useDebouncedValue(valeur, delai = 300)` et `useDocumentTitle(titre)`.

`useDraftAutosave` ne sérialise plus le `contenu` à chaque rendu, seulement quand il change d'identité : un gros brouillon ne coûte plus rien aux rendus qui ne le touchent pas. Le `contenu` doit donc être une référence stable (état React, `useMemo`) et ne jamais être modifié sur place.
