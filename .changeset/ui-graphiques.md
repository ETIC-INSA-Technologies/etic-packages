---
"@etic-insa/ui": minor
---

Tableaux de bord : `VerdictPanel` (verdict d'une page de supervision, au `ton` d'état : signe,
phrase, détail, action) et `ProgressRing` (jauge circulaire en SVG, le pendant rond de
`Progress`). Nouvelle entrée `@etic-insa/ui/charts` : le Chart de shadcn (`ChartContainer`,
`ChartTooltip`, `ChartLegend`…) sur recharts, dépendance pair facultative que seule une
application à graphiques installe. Le plugin Vite des sources locales sert aussi cette entrée et
n'emploie qu'une copie de recharts.
