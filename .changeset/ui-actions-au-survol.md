---
"@etic-insa/ui": minor
---

`dataTableActionsColumn` : les commandes d'une ligne (supprimer…) ne s'affichent plus que sur la
ligne survolée, plutôt que la même icône répétée sur chaque ligne. Elles sont transparentes, pas
retirées : toujours dans l'ordre de tabulation et lues par les lecteurs d'écran. Elles
apparaissent aussi quand le focus est dans la ligne (clavier), quand l'une d'elles a ouvert un
menu, et toujours sur écran tactile (pas de survol). Nouvelle option `toujoursVisibles` pour
garder l'ancien affichage sur une liste donnée. Rien à faire côté application.

Sur la ligne survolée (ou qui a le focus), chaque commande prend déjà sa couleur, sans attendre
le survol du bouton :
la corbeille (`TooltipButton` `destructif`, `DeleteButton`) rougit, un `IconToggle` inactif
passe en couleur de texte ; le survol du bouton n'ajoute que son fond. Verrouillées, elles
restent grises.
