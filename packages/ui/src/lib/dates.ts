/**
 * Passage entre les dates ISO sans heure d'une API (`AAAA-MM-JJ` : date de
 * naissance, début d'une phase) et les `Date` du `DatePicker`. Les deux sens
 * restent en heure locale : `new Date("2001-05-04")` lirait minuit UTC, donc
 * la veille au soir à l'ouest de Greenwich, et `toISOString()` ferait l'erreur
 * inverse à l'est (minuit à Paris est encore la veille en UTC).
 *
 * ```tsx
 * <DatePicker
 *   valeur={lireDateIso(membre.date_naissance)}
 *   onValeurChange={(date) => setDateNaissance(ecrireDateIso(date))}
 * />
 * ```
 */

const DATE_ISO = /^(\d{4})-(\d{2})-(\d{2})$/

/** `"2001-05-04"` → 4 mai 2001 à minuit, heure locale ; `undefined` si vide
 *  ou illisible (autre format, 31 février). */
export function lireDateIso(
  texte: string | null | undefined
): Date | undefined {
  const correspondance = texte ? DATE_ISO.exec(texte) : null
  if (!correspondance) return undefined
  const [annee, mois, jour] = correspondance.slice(1).map(Number)
  const date = new Date(annee, mois - 1, jour)
  // `new Date(50, …)` vise 1950 : l'année est reposée telle quelle.
  date.setFullYear(annee)
  // Rejette un 31 février, que `Date` reporterait au 3 mars.
  return date.getMonth() === mois - 1 && date.getDate() === jour
    ? date
    : undefined
}

/** 4 mai 2001 (heure ignorée) → `"2001-05-04"` ; `null` sans date ou pour une
 *  date invalide. */
export function ecrireDateIso(date: Date | null | undefined): string | null {
  if (!date || Number.isNaN(date.getTime())) return null
  const chiffres = (n: number, largeur = 2) => String(n).padStart(largeur, "0")
  return `${chiffres(date.getFullYear(), 4)}-${chiffres(date.getMonth() + 1)}-${chiffres(date.getDate())}`
}
