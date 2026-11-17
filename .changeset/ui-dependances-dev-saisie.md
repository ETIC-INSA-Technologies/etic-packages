---
"@etic-insa/ui": patch
---

`vite` et `@testing-library/react` ne sont plus déclarés en dépendances pairs facultatives : npm
marquait `devOptional` dans le lockfile des applications tout l'arbre de ces outils de
développement, qui entrait dans `npm audit --omit=dev`, l'audit de ce qui part en production.
Rien ne change pour le plugin `@etic-insa/ui/vite` ni pour `@etic-insa/ui/test/controles`, qui
emploient ceux de l'application (README, « Outils de développement hors des dépendances
pairs »).

`SaveBar` collante : au téléphone, le statut (« Modifications non enregistrées ») passe seul sur
la ligne du dessus quand il ne tient plus en deux lignes à côté des boutons, au lieu de s'étirer
sur trois lignes.
