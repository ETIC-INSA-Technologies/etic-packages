---
"@etic-insa/ui": patch
---

`SaveBar collante` ne se colle en bas de l'écran, sur sa carte, que tant qu'il y a des
modifications (`modifie`) ou un envoi en cours (`enCours`). Sans modification, elle reste à sa
place sous le formulaire, sans carte : elle ne flotte plus sur le contenu comme un bandeau vide
portant un bouton grisé. La carte est désormais pleinement opaque (un fond translucide et flouté
laissait deviner le texte recouvert), et le statut se range à gauche, les boutons à droite. Rien
à faire côté application, si ce n'est passer `modifie` comme le recommandait déjà la
documentation.
