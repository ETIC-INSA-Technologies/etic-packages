/**
 * Texte d'une valeur absente, commun à `EmptyValue` et au repli de tous les
 * formateurs (`formaterDate(null)`…) : « — » par défaut. Une application qui
 * en veut un autre le règle une fois, au démarrage, par `setEmptyValue`.
 *
 * Rangé sur `globalThis`, pas dans une variable du module : une application
 * qui pré-assemble l'index pour ses tests (`deps.optimizer` de vitest) en a
 * une autre copie, et le réglage doit valoir pour les deux (comme la pause de
 * frappe, `delai-frappe.ts`).
 */
const CLE = Symbol.for("@etic-insa/ui/valeur-absente")
const DEFAUT = "—"

type AvecValeurAbsente = { [CLE]?: string }

/** Le texte d'une valeur absente : « — », sauf réglage par `setEmptyValue`. */
export function getEmptyValue(): string {
  return (globalThis as AvecValeurAbsente)[CLE] ?? DEFAUT
}

/**
 * Règle le texte d'une valeur absente pour toute l'application : celui
 * d'`EmptyValue` et le repli par défaut des formateurs (`formaterDate`,
 * `formaterMontant`…). Un `repli` passé à un formateur reste respecté. À
 * appeler une fois, avant le premier rendu (dans `main.tsx`, et dans la mise
 * en place des tests pour qu'ils voient le même texte) : les composants déjà
 * rendus ne sont pas redessinés. Sans argument, rend « — ».
 *
 * ```ts
 * setEmptyValue("-")
 * ```
 */
export function setEmptyValue(texte?: string): void {
  if (texte === undefined) {
    delete (globalThis as AvecValeurAbsente)[CLE]
    return
  }
  if (texte.trim() === "")
    throw new RangeError(
      "Valeur absente invalide : un texte visible, pas une chaîne vide."
    )
  ;(globalThis as AvecValeurAbsente)[CLE] = texte
}
