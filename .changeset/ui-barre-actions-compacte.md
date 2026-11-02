---
"@etic-insa/ui": minor
---

`DataTableBulkActions` plus compacte, pour accueillir plus d'actions :

- le compte situe la sélection dans le `total` du tableau : « 25 membres sur 37 sélectionnés »
  (le nom de la barre et l'annonce suivent) ;
- « Sélectionner les 37 membres » passe dans un menu « … » (« Plus d'actions »), qui n'apparaît
  que s'il a quelque chose à proposer ;
- nouvelle prop `actionsSecondaires` : des `DropdownMenuItem` rangés dans ce même menu, pour les
  actions moins fréquentes ;
- « Tout désélectionner » devient une croix seule, avec infobulle, en bureau comme sur téléphone
  (nom accessible et Échap inchangés).

À adapter côté application : les tests qui cherchent le bouton « Sélectionner les N … » doivent
ouvrir « Plus d'actions » et choisir l'entrée de menu, et ceux qui lisent le compte d'une barre
avec `total` y trouvent « sur N ».
