// Textes chiffrés de la famille DataTable (compteur, proposition « tout
// sélectionner », barre d'actions groupées) : un seul endroit pour le
// format français et les accords.

/** Nom des éléments d'une liste, au singulier et au pluriel. */
export interface DataTableUnite {
  singulier: string
  pluriel: string
}

export const UNITE_PAR_DEFAUT: DataTableUnite = {
  singulier: "élément",
  pluriel: "éléments",
}

/** 1234 → « 1 234 » (espace fine insécable, comme `Intl`). */
export const nombreFr = (n: number) => n.toLocaleString("fr-FR")

/** Nom accordé au nombre : 0 et 1 au singulier, comme en français. */
export const uniteAccordee = (n: number, unite: DataTableUnite) =>
  n > 1 ? unite.pluriel : unite.singulier

/** Participe accordé : `participe("sélectionné", 3, true)` → « sélectionnées ». */
export const participe = (base: string, n: number, feminin: boolean) =>
  `${base}${feminin ? "e" : ""}${n > 1 ? "s" : ""}`
