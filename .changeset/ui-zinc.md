---
"@etic-insa/ui": patch
---

Les neutres du thème (fonds, panneaux, bordures, textes secondaires, anneau de focus et accent
par défaut, barre latérale) passent de la couleur de base `gray` de shadcn, légèrement bleutée, à
la couleur de base `zinc` (registre shadcn, palette `zinc` de Tailwind 4 : gris froid presque
neutre). Les écarts d'ETIC sont gardés et recalculés sur `zinc` : `--page` zinc-50 en clair,
barre latérale blanche en clair, `--muted-foreground` clair un peu plus foncé que zinc-500
(4,64:1 sur `--muted`), `--control-border`, couleurs sémantiques inchangées (tous les contrastes
exigés restent atteints). Rien à faire côté application, sauf si elle surchargeait des neutres :
les recalculer sur `zinc`.
