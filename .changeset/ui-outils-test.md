---
"@etic-insa/ui": minor
---

`@etic-insa/ui/test` : outils pour les tests des applications, dans une entrée à part qui
n'entre pas dans leur bundle. `installMatchMedia()` pose une doublure pilotable de
`window.matchMedia` (affichage de bureau au départ), `setMobileViewport(true)` passe les
composants abonnés à `useIsMobile` en affichage mobile.
