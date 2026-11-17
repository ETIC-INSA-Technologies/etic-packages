---
"@etic-insa/ui": patch
---

`creerLienRouteur` : sans `href` (ou avec `href=""`), le lien est rendu désactivé
(`role="link"`, `aria-disabled="true"`, son `onClick` retiré) au lieu d'un `<a>` muet que rien
ne distinguait d'un lien cassé ; toujours sans adresse devinée, ni l'accueil ni la page
courante.
