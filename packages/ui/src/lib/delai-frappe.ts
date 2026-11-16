/**
 * Pause de frappe par défaut des recherches (`SearchSelect`,
 * `useDebouncedValue`, `useDebouncedSearch`), en millisecondes : celle de tout
 * appel qui ne passe pas `delai`. Les tests la règlent par `setSearchDelay`
 * (`@etic-insa/ui/test`) ; une application n'a pas à y toucher.
 *
 * Rangée sur `globalThis`, pas dans une variable du module : une application
 * qui pré-assemble l'index pour ses tests (`deps.optimizer` de vitest) en a une
 * autre copie que `@etic-insa/ui/test`, et le réglage doit valoir pour les deux.
 */
const CLE = Symbol.for("@etic-insa/ui/delai-frappe")
const DEFAUT = 300

type AvecDelai = { [CLE]?: number }

export function delaiFrappeParDefaut(): number {
  return (globalThis as AvecDelai)[CLE] ?? DEFAUT
}

/** Sans argument : retour à la pause d'origine. */
export function definirDelaiFrappe(millisecondes?: number): void {
  if (millisecondes === undefined) {
    delete (globalThis as AvecDelai)[CLE]
    return
  }
  if (!Number.isFinite(millisecondes) || millisecondes < 0)
    throw new RangeError(
      `Pause de frappe invalide : ${millisecondes} (un nombre de millisecondes ≥ 0).`
    )
  ;(globalThis as AvecDelai)[CLE] = millisecondes
}
