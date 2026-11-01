// Textes chiffrés de la famille DataTable (compteur, proposition « tout
// sélectionner », barre d'actions groupées). Les accords et le format des
// nombres viennent du module commun `lib/format`, exporté aux applications.

import type { Unite } from "@etic-ui/lib/format"

export { nombreFr, participe, uniteAccordee } from "@etic-ui/lib/format"

/** Nom des éléments d'une liste, au singulier et au pluriel. */
export type DataTableUnite = Unite

export const UNITE_PAR_DEFAUT: DataTableUnite = {
  singulier: "élément",
  pluriel: "éléments",
}
