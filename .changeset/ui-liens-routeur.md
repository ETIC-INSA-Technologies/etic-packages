---
"@etic-insa/ui": minor
---

Liens : `creerLienRouteur(Link)` adapte le `Link` d'un routeur (destination dans `to`) au
`LienProvider`, sans que la bibliothèque importe de routeur ; sans `href`, un texte inerte.
`DataTableCellLink` prend `externe` (nouvel onglet, flèche sortante) et `libelleExterne`
(destination dite aux lecteurs d'écran) ; `NOUVEL_ONGLET` et
`MarqueExterne` (avec `libelle`, « nouvel onglet » par défaut) sont exportés pour un lien
sortant composé à la main.
