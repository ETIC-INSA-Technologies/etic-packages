/**
 * Textes chiffrés en français, communs à la suite : accords, nombres, octets,
 * durées et dates. Chaque formateur rend un repli (« — » par défaut) pour une
 * valeur absente, et rend telle quelle une date illisible (une valeur
 * inattendue de l'API reste visible au lieu de « Invalid Date »).
 */

import { lireDateIso } from "@etic-ui/lib/dates"

// Accords et nombres

/** Nom d'un élément, au singulier et au pluriel. */
export interface Unite {
  singulier: string
  pluriel: string
}

/** 1234 → « 1 234 » (espace fine insécable, comme `Intl`). */
export const nombreFr = (n: number) => n.toLocaleString("fr-FR")

/** Nom accordé au nombre : 0 et 1 au singulier, comme en français. */
export const uniteAccordee = (n: number, unite: Unite) =>
  n > 1 ? unite.pluriel : unite.singulier

/** Participe accordé : `participe("sélectionné", 3, true)` → « sélectionnées ». */
export const participe = (base: string, n: number, feminin: boolean) =>
  `${base}${feminin ? "e" : ""}${n > 1 ? "s" : ""}`

/** Mot accordé au nombre : `accorde(3, "ligne")` → « lignes » ; pluriel
 *  irrégulier en troisième argument (`accorde(2, "journal", "journaux")`). */
export const accorde = (n: number, singulier: string, pluriel?: string) =>
  uniteAccordee(n, { singulier, pluriel: pluriel ?? `${singulier}s` })

/** Nombre et nom accordé : `compte(1234, "ligne")` → « 1 234 lignes »,
 *  `compte(0, "doublon")` → « 0 doublon ». */
export const compte = (n: number, singulier: string, pluriel?: string) =>
  `${nombreFr(n)} ${accorde(n, singulier, pluriel)}`

// Octets

const UNITES_OCTETS = ["o", "Ko", "Mo", "Go", "To"]

/** Taille en octets, en base 1024 : « 0 o », « 512 o », « 1,5 Ko »,
 *  « 120 Mo » (une décimale sous 100). */
export function formaterOctets(
  octets: number | null | undefined,
  repli = "—"
): string {
  if (octets === null || octets === undefined) return repli
  if (octets === 0) return "0 o"
  let valeur = octets
  let unite = 0
  while (valeur >= 1024 && unite < UNITES_OCTETS.length - 1) {
    valeur /= 1024
    unite += 1
  }
  const decimales = valeur >= 100 || unite === 0 ? 0 : 1
  return `${valeur.toLocaleString("fr-FR", { maximumFractionDigits: decimales })} ${UNITES_OCTETS[unite]}`
}

// Durées

/** Durée en secondes, ses deux plus grandes unités : « 3 j 4 h »,
 *  « 2 h 15 min », « 15 min », « 42 s ». */
export function formaterDuree(
  secondes: number | null | undefined,
  repli = "—"
): string {
  if (secondes === null || secondes === undefined) return repli
  const j = Math.floor(secondes / 86400)
  const h = Math.floor((secondes % 86400) / 3600)
  const min = Math.floor((secondes % 3600) / 60)
  if (j > 0) return `${j} j ${h} h`
  if (h > 0) return `${h} h ${min} min`
  if (min > 0) return `${min} min`
  return `${Math.floor(secondes)} s`
}

/** L'ordre de grandeur d'une durée, sa plus grande unité seulement : « 3 j »,
 *  « 18 h », « 15 min » (jamais en secondes : « 0 min » sous la minute). */
export function formaterDureeArrondie(secondes: number): string {
  const j = Math.floor(secondes / 86400)
  if (j > 0) return `${j} j`
  const h = Math.floor(secondes / 3600)
  if (h > 0) return `${h} h`
  return `${Math.floor(secondes / 60)} min`
}

export interface AncienneteOptions {
  /** Plus grande unité seulement (« 3 j ») au lieu des deux (« 3 j 4 h »). */
  arrondie?: boolean
  /** Précédée de « il y a » (par défaut) ; `false` pour « 3 j » seul. */
  ilYA?: boolean
  /** Texte d'une valeur absente. */
  repli?: string
}

/** Ancienneté d'un instant ISO : « il y a 3 j 4 h », ou « à l'instant » sous
 *  la minute (instant à venir compris). */
export function formaterAnciennete(
  valeur: string | null | undefined,
  { arrondie = false, ilYA = true, repli = "—" }: AncienneteOptions = {}
): string {
  if (!valeur) return repli
  const instant = new Date(valeur).getTime()
  if (Number.isNaN(instant)) return valeur
  const secondes = (Date.now() - instant) / 1000
  if (secondes < 60) return "à l'instant"
  const duree = arrondie
    ? formaterDureeArrondie(secondes)
    : formaterDuree(secondes)
  return ilYA ? `il y a ${duree}` : duree
}

// Dates

function lireInstant(valeur: string): Date | null {
  const date = new Date(valeur)
  return Number.isNaN(date.getTime()) ? null : date
}

/** Date seule, mois en lettres : « 05 juillet 2026 ». Une date sans heure
 *  (`2026-07-05`, une date de naissance) est lue en heure locale : lue comme
 *  minuit UTC, ce serait la veille à l'ouest de Greenwich. */
export function formaterDate(
  valeur: string | null | undefined,
  repli = "—"
): string {
  if (!valeur) return repli
  const date = lireDateIso(valeur) ?? lireInstant(valeur)
  if (!date) return valeur
  return date.toLocaleDateString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  })
}

/** Date et heure compactes, en chiffres : « 05/07/2026 14:30 ». */
export function formaterDateHeure(
  valeur: string | null | undefined,
  repli = "—"
): string {
  if (!valeur) return repli
  const date = lireInstant(valeur)
  if (!date) return valeur
  return date.toLocaleString("fr-FR", {
    dateStyle: "short",
    timeStyle: "short",
  })
}

/** Date et heure à la seconde : « 05/07/2026 14:30:12 », là où l'instant
 *  exact compte (journal, événements). */
export function formaterHorodatage(
  valeur: string | null | undefined,
  repli = "—"
): string {
  if (!valeur) return repli
  const date = lireInstant(valeur)
  if (!date) return valeur
  return date.toLocaleString("fr-FR")
}

/** Date et heure, mois en lettres, pour une fiche : « 05 juillet 2026 à 14:30 ». */
export function formaterDateHeureLongue(
  valeur: string | null | undefined,
  repli = "—"
): string {
  if (!valeur) return repli
  const date = lireInstant(valeur)
  if (!date) return valeur
  return date.toLocaleString("fr-FR", {
    day: "2-digit",
    month: "long",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}
