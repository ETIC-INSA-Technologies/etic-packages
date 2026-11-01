---
"@etic-insa/ui": minor
---

Thème : les neutres passent à la couleur de base `gray` de shadcn (palette `gray` de Tailwind 4, légèrement bleutée), commune à toute la suite. Fonds, panneaux, bordures et textes changent légèrement de teinte, en clair comme en sombre ; une application qui surchargeait ces jetons pour obtenir des gris bleutés (`--background`, `--card`, `--muted`, `--border`…, et les jetons qui les suivaient : `--card-foreground`, `--secondary`, `--accent`, `--sidebar-*`…) peut retirer ces surcharges. Le contrat d'accent ne change pas. `--muted-foreground` reste un peu plus foncé que le registre en clair (≥ 4,5:1 sur `--muted`), et le bord d'une case à cocher vide (`--control-border`) atteint 3:1 en sombre aussi. Les couleurs de graphique (`--chart-*`) sont celles du registre `gray`.

`color-scheme` suit le thème (`light` dans `:root`, `dark` dans `.dark`) : barres de défilement et contrôles natifs dans le thème de la page, même forcé à l'inverse du système. Les applications retirent leurs propres déclarations.

Application du thème : `appliquerTheme(theme)` pose la classe `dark` sur `<html>` et, en `"system"`, suit `prefers-color-scheme` et ses changements ; `appliquerEtMemoriserTheme` le mémorise aussi dans ce navigateur (`localStorage`, clé `CLE_THEME`, `"etic-theme"`) ; `useThemeApplique(theme, onThemeAutreOnglet?)` peint le thème du compte dès qu'il est connu et suit les changements faits dans un autre onglet. `THEMES` et `estThemePreference` complètent le type `ThemePreference`, toujours exporté. Le script de démarrage `@etic-insa/ui/theme-boot.js` peint le thème mémorisé avant le premier rendu : l'application le sert depuis son origine et le charge dans `<head>` (voir le README).

`CenteredScreen` est posé sur `bg-muted/40` au lieu de `bg-muted` : un fond moins appuyé, surtout en sombre.
