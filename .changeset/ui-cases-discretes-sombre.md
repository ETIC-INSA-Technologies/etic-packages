---
"@etic-insa/ui": patch
---

Thème sombre : le bord d'une case à cocher vide, le contour d'une radio non cochée et le rail
d'un switch éteint reprennent `--input`, comme shadcn, au lieu de `--muted-foreground` à 65 % :
plus discrets, notamment dans la colonne de sélection d'un tableau (exception assumée à
WCAG 1.4.11). Thème clair inchangé ; rien à faire côté application.
