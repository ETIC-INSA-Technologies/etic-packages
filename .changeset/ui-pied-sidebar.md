---
"@etic-insa/ui": patch
---

`AppShell`, pied de la barre latérale : le bouton de thème n'a plus de fond propre en sombre (le
`dark:bg-input/30` de la variante `outline` tranchait sur la barre) et prend le survol du menu
du compte voisin (`bg-sidebar-accent`). L'avatar du compte passe du rond au carré arrondi
(`rounded-lg`, comme le `nav-user` de shadcn), à la forme du survol de son bouton et du bouton de
thème, barre repliée comprise ; le survol du menu du compte passe lui aussi à `rounded-lg`. Rien
à faire côté application.
