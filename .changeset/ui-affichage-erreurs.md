---
"@etic-insa/ui": minor
---

`ErrorBannerProvider` règle une fois, à la racine, l'affichage des erreurs de tous les bandeaux
de la bibliothèque (`ErrorBanner`, `QueryErrorBanner`, `QueryBoundary`, le bandeau de
`DataTable`, l'erreur de `ConfirmDialog`, de `FormDialog` et de `DraftResumeDialog`) :
`masquerCode` n'affiche plus le code devant le message, `decrire` remplace la lecture de
l'erreur. Sans lui, rien ne change. `decrireErreur`, `BoutonReessayer` (nouvelle option `size`)
et `DetailTechnique` sont exportés.

Correction : la colonne du texte d'un bandeau d'erreur est bornée ; une chaîne sans espace se
coupe au lieu d'élargir la colonne et de passer sous « Réessayer ».
