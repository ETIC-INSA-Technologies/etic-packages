---
"@etic-insa/ui": minor
---

`@etic-insa/ui/test/controles`, nouvelle entrée : `inactif`, `coche`, `appuyer`, `choisir`,
`optionsDe`, `valeurAffichee` et `chercher`, pour lire et manipuler les contrôles de la
bibliothèque dans les tests. Elle importe `@testing-library/react`, qui devient une dépendance
pair facultative ; `@etic-insa/ui/test` (`installMatchMedia`…) ne change pas et n'en a pas
besoin.
