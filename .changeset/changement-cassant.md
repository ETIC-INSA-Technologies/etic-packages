---
"@etic-insa/ui": minor
---

Changement cassant (API de 0.1.0) : `ThemeMenu.changer` devient `onValeurChange` (de même dans `theme` d'`AppShell` : `{ valeur, onValeurChange }`), `AppShellCompte.seDeconnecter` devient `onSeDeconnecter`, et l'action d'une entrée du menu du compte, `onSelect`, devient `onChoisir`. Les dépendances pairs exigent React 19.2 ou plus récent (`react`, `react-dom` : `^19.2.0`) et `lucide-react` (`^1.64.0`), fourni par l'application au lieu d'être embarqué.
