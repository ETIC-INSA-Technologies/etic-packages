---
"@etic-insa/ui": minor
---

Statuts et indicateurs :

- `StatusTon` gagne `info` (bleu, pour un changement sans gravité) : `StatusBadge`, `StatTile`, `IconToggle` et la nouvelle variante `info` de `Badge` l'acceptent.
- `Progress` accepte `ton` (piste et remplissage de la couleur de l'état : `warning` au-delà d'un seuil, `destructive` quand c'est plein) et `size="lg"` (piste de 8 px) : plus besoin de viser `[data-slot=progress-track]` par `className`.
- `SegmentedControlOption` accepte `ton` : le segment choisi prend la couleur de l'état que produit le choix (fond, texte, liseré), sans `className`.
- `Badge` accepte `size="lg"` (28 px), et `RemovableBadge` est un badge de cette taille terminé par une croix « Retirer » (`onRetirer`, `libelleRetirer` qui nomme l'élément, `enCours` occupé sans perdre le focus, `verrou` qui dit pourquoi le retrait est impossible).
- Nouveaux `ExplainedBadge` (badge dont l'explication s'ouvre au survol et au focus et se lit après le badge), `SaveBar` (« Enregistrer », « Annuler » au besoin, statut annoncé « Enregistré » ou, avec `modifie`, « Modifications non enregistrées », variante `collante` en bas d'un long formulaire) et `StatGrid` (rangée de `StatTile` en colonnes de `largeurMin` au moins, une seule sur téléphone).

`StatusTon` s'importe toujours de la racine du paquet.

Seul point de compatibilité : une application qui associe une valeur à chaque ton par un `Record<StatusTon, …>` doit y ajouter `info` (erreur de type sinon). Rien ne change à l'exécution.
