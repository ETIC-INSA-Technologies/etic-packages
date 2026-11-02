---
"@etic-insa/ui": patch
---

La liste d'un `Select` prend la largeur de ses options — au moins celle du champ, au plus
l'espace disponible — au lieu de la largeur exacte du champ, qui coupait net les options plus
longues que lui (un champ étroit dans un tableau, une barre d'actions). Une option qui dépasse
encore l'espace disponible passe à la ligne. Dans le champ, une valeur trop longue finit par
« … » au lieu d'être coupée net (le `flex` de shadcn sur la valeur annulait son `line-clamp-1`) ;
une icône dans la valeur reste en ligne avec le texte. Rien à faire côté application.
