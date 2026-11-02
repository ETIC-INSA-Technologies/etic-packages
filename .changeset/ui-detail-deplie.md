---
"@etic-insa/ui": patch
---

`DataTable` : la ligne dépliée et son détail se lisent comme un seul bloc. La ligne perd sa
bordure basse et prend le fond du détail (`bg-muted/50`) ; le détail, qui avait un fond plus
clair (`bg-muted/30`), suit celui de la ligne, teinte de la sélection comprise. Rien à faire côté
application.
