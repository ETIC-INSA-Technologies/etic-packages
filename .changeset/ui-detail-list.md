---
"@etic-insa/ui": minor
---

`DetailList` accepte `disposition` (type exporté `DetailListDisposition`) : `grille` (défaut, rendu inchangé : une colonne sur téléphone, autant que la largeur en permet au-delà), `pile` (une seule colonne à toute largeur, libellé au-dessus de la valeur, pour une carte étroite, un dialogue ou des valeurs longues : remplace `className="sm:grid-cols-1"`) ou `ligne` (métadonnées secondaires : « libellé : valeur » en petit et en discret, l'une après l'autre sur toute la largeur). La liste porte `data-disposition`.
