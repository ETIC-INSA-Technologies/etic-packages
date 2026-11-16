/** Un groupe : sa clé, son libellé, ses éléments dans l'ordre d'apparition. */
export interface Groupe<T> {
  cle: string
  libelle: string
  elements: T[]
}

/**
 * Regroupe une liste par clé en gardant l'ordre d'apparition, celui dans
 * lequel l'API l'a servie : pour les groupes (dans l'ordre de leur premier
 * élément) comme pour leurs éléments. Le libellé d'un groupe est lu sur son
 * premier élément : de préférence celui que le serveur rédige à côté de
 * chaque élément, pour qu'un groupe nouveau s'affiche sans table locale.
 * Pour des groupes triés, trier le résultat (`comparerFr` sur `libelle`).
 *
 * ```ts
 * grouperPar(templates, (t) => t.format, (t) => t.format_libelle)
 * // [{ cle: "docs", libelle: "Documents", elements: [...] }, …]
 * ```
 */
export function grouperPar<T>(
  elements: readonly T[],
  cle: (element: T) => string,
  libelle: (element: T) => string
): Groupe<T>[] {
  const groupes = new Map<string, Groupe<T>>()
  for (const element of elements) {
    const valeur = cle(element)
    let groupe = groupes.get(valeur)
    if (!groupe) {
      groupe = { cle: valeur, libelle: libelle(element), elements: [] }
      groupes.set(valeur, groupe)
    }
    groupe.elements.push(element)
  }
  return [...groupes.values()]
}
