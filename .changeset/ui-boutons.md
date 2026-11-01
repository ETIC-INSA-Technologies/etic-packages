---
"@etic-insa/ui": minor
---

Boutons et infobulles :

- `TooltipButton` à icône seule (`size` `icon…`) est nommé par son `infobulle` (`aria-label`), comme le promettait sa documentation, même verrouillé (la raison reste sa description) ; un `aria-label` ou `aria-labelledby` donné par l'application est gardé, et un bouton à texte garde son texte pour nom. L'application peut retirer l'`aria-label` qu'elle recopiait de l'infobulle.
- Un `Button` `aria-disabled` (désactivé mais focalisable : `focusableWhenDisabled`, `TooltipButton` verrouillé, validation d'un `ConfirmDialog` à `saisie`, boutons d'un dialogue pendant son action) prend l'allure désactivée : estompé, curseur interdit, sans enfoncement au clic. Il reste survolable pour son infobulle. Les règles CSS ajoutées par les applications pour ce cas peuvent disparaître.
- `Button` accepte `enCours` et `libelleEnCours` (même nom que l'`enCours` d'`IconToggle` ou d'`ErrorBanner`) : roue muette à la place de ses icônes, `aria-busy`, clics ignorés, focus gardé. `SpinnerDecoratif` (roue sans rôle ni nom) est exporté, ainsi que `fermerSaufEnCours(enCours, fermer)`, l'`onOpenChange` d'un dialogue qui refuse de se fermer pendant son action.
- `Button` a une taille `inline` (`variant="link" size="inline"`) : lien dans une phrase ou une cellule, sans hauteur ni marge de bouton, cible de 24 px gardée.
- `TooltipButton` accepte `destructif` : gris au repos, rouge au survol seulement (gris aussi verrouillé).
- Nouveau `ButtonLink` : lien à l'allure de bouton (`variant`, `size`), annoncé comme un lien ; `lien` reçoit le composant de lien du routeur de l'application, comme pour `AppShell` (`<a>` par défaut).
- `CopyButton` dans un `InputGroupAddon` passe à 24 px, comme le bouton de shadcn dans un groupe : à 28 px, il touchait presque la bordure du champ et son anneau de focus en sortait. Une `size` donnée par l'application est respectée.
