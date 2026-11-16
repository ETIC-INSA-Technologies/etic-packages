import { ErreurApi } from "./client"

/** Un champ refusé par le serveur : une entrée de `details.errors[]`. */
export interface ErreurChamp {
  /** Chemin du champ, segments joints par des points (`body.phases.0.nb_jeh`) ;
   *  vide si le serveur n'en donne pas. */
  chemin: string
  /** Motif lisible, rédigé par le serveur ; `null` s'il manque. */
  msg: string | null
  /** Code machine du refus (`greater_than_equal`…) ; `null` s'il manque. */
  type: string | null
}

/** Une chaîne non vide, ou `null` : les détails d'une `ErreurApi` sont du
 *  JSON libre. */
function texte(valeur: unknown): string | null {
  return typeof valeur === "string" && valeur.trim() !== "" ? valeur : null
}

/**
 * Les champs refusés d'une `ErreurApi`, lus dans l'enveloppe commune des API
 * ETIC : `details.errors = [{ loc, msg, type }]`, servi pour un corps ou des
 * paramètres refusés (422). Vide pour toute autre erreur ; une entrée mal
 * formée donne des champs vides plutôt qu'une exception.
 *
 * ```ts
 * const refus = erreursChamps(erreur).find((c) => c.chemin === "body.email")
 * <FormField libelle="E-mail" erreur={refus?.msg ?? undefined}>…</FormField>
 * ```
 */
export function erreursChamps(erreur: unknown): ErreurChamp[] {
  if (!(erreur instanceof ErreurApi)) return []
  const entrees = erreur.details?.["errors"]
  if (!Array.isArray(entrees)) return []
  return entrees.map((entree: unknown) => {
    const { loc, msg, type } = (entree ?? {}) as {
      loc?: unknown
      msg?: unknown
      type?: unknown
    }
    return {
      chemin: Array.isArray(loc) ? loc.join(".") : "",
      msg: texte(msg),
      type: texte(type),
    }
  })
}
