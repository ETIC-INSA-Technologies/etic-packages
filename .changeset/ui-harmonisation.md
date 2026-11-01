---
"@etic-insa/ui": minor
---

Harmonisation des boutons occupés, des liens et des explications.

- Un seul état « en cours » : la confirmation de `ConfirmDialog`, l'envoi de `FormDialog`, « Repartir de zéro » de `DraftResumeDialog`, « Réessayer » d'`ErrorBanner`, `FileUploadButton` et `IconToggle` sont tous le `Button` en cours (roue muette à la place de l'icône, `aria-busy`, `data-en-cours`, focus gardé). La roue de `FileUploadButton` n'a plus de nom « Chargement » lu en double.
- `IconToggle` est rendu en `Button` à icône (carré, comme la corbeille de `DeleteButton` à côté) : son API ne change pas. À vérifier à l'écran.
- `FormDialog` : `actionSecondaire.onChoisir` peut renvoyer une promesse, attendue comme un envoi (bouton en cours, dialogue figé, erreur en tête) ; une action secondaire `destructif` est grise et rouge au survol, comme `TooltipButton destructif`, au lieu d'un texte rouge.
- `LienProvider lien={RouterLink}` (et `useLien`, type `LienComposant`) : `AppShell`, `DetailHeader`, `ButtonLink` et `DataTableCellLink` prennent le lien du routeur sans `lien={…}` à chaque appel ; la prop `lien` reste prioritaire. `AppShellLienComposant` reste un alias.
- `ErrorBoundary` : « Retour à l'accueil » est un `ButtonLink` (`lien="a"`, rechargement complet gardé).
- `Toggletip` : explication sur `Popover`, ouverte au toucher, au clic, au survol et au focus clavier, fermée au toucher ailleurs, à Échap ou quand le focus part. `ExplainedBadge` en est fait (même API) : son explication s'ouvre maintenant au toucher.
- Infobulles (écart shadcn) : `TooltipTrigger` ne s'ouvre plus sur le focus qu'un menu ou un calendrier rend à son déclencheur en se fermant (Échap, Entrée, clic) ; seule une navigation au clavier (Tab, flèches) l'ouvre au focus. L'Échap suivant ferme bien le dialogue englobant (`ThemeMenu`, « Plus d'actions » de `DetailHeader`).
