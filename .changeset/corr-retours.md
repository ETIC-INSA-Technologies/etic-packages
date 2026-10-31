---
"@etic-insa/ui": minor
---

Ajoute `PageContainer` (marges, largeur maximale et espacement d'une page dans `AppShell`), la primitive shadcn `Slider`, les variantes `warning`, `info` et `success` d'`Alert` (couleur `--info` du thème) et un lien « Aller au contenu » et un bouton de repli visible dans `AppShell`. `ConfirmDialog`, `FormDialog` et `DeleteButton` restent ouverts sans erreur quand leur action renvoie `false` (suppression en deux temps), gardent le focus pendant l'action et acceptent `finalFocus` ; `FormDialog` vérifie les champs sans la bulle du navigateur et accepte `verrouEnvoi`. `CopyButton` signale un échec de copie et accepte `verrou`. Sous `prefers-reduced-motion: reduce`, animations et transitions sont neutralisées. Ctrl+B ne replie plus la barre latérale depuis un champ de saisie.
