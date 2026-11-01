/**
 * Attributs qui tiennent les gestionnaires de mots de passe à l'écart d'un
 * champ qui n'est pas un identifiant (recherche, champ d'administration,
 * fiche d'une autre personne).
 *
 * `autoComplete="off"` seul est souvent ignoré : 1Password, LastPass et
 * Bitwarden ont chacun leur attribut, d'où les quatre ensemble.
 *
 * ```tsx
 * <Input type="search" {...NO_AUTOFILL} />
 * ```
 */
export const NO_AUTOFILL = {
  autoComplete: "off",
  "data-1p-ignore": true,
  "data-lpignore": "true",
  "data-bwignore": true,
} as const
