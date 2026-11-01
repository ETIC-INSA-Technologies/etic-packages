---
"@etic-insa/ui": minor
---

Dans `AppShell`, la validation de la déconnexion est en rouge (variante `destructive`), comme celle d'un `ConfirmDialog`.

`Checkbox` : le bord d'une case vide se voit en clair (`--control-border`, `--muted-foreground` à 80 %, ≥ 3:1 ; inchangé en sombre).

`IconToggle` accepte `ton` (`neutral`, `success`, `warning`, `destructive`) : actif, le bouton prend cette couleur, `warning` (jaune) par défaut, puisqu'il signale un élément sensible ; `ton="neutral"` garde le fond gris du `Toggle`. Inactif, il est gris (`--muted-foreground`), comme les icônes d'action voisines.
