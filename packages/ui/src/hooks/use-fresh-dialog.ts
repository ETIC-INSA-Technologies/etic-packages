import { useCallback, useState } from "react"

export interface FreshDialogEtat {
  /** À passer en `key` au dialogue : elle change à chaque demande, et le
   *  formulaire repart neuf. */
  cle: number
  /** Le dialogue a été demandé au moins une fois : avant, rien n'est monté
   *  ni lu. */
  monte: boolean
  ouvert: boolean
  /** Ouvre le dialogue, neuf. Stable. */
  ouvrir: () => void
  /** Pour `onOuvertChange` du dialogue : seule la fermeture agit. */
  onOuvertChange: (ouvert: boolean) => void
}

/**
 * Un dialogue qui repart d'un formulaire neuf à chaque ouverture, sans
 * vider ses champs à la main : sa `key` change à chaque demande, et fermé,
 * il reste monté le temps de son animation (son contenu ne disparaît pas en
 * glissant).
 *
 * `demandesExternes` : un compteur de demandes tenu ailleurs (un geste de la
 * page parente, un raccourci) ; chaque incrément ouvre le dialogue, comme
 * `ouvrir`.
 *
 * ```tsx
 * const creation = useFreshDialog()
 * <Button onClick={creation.ouvrir}>Nouveau groupe</Button>
 * {creation.monte ? (
 *   <FormDialog key={creation.cle} ouvert={creation.ouvert}
 *     onOuvertChange={creation.onOuvertChange} … />
 * ) : null}
 * ```
 */
export function useFreshDialog(demandesExternes = 0): FreshDialogEtat {
  const [demandesLocales, setDemandesLocales] = useState(0)
  // Le nombre de demandes à la dernière fermeture : ouvert tant qu'une
  // demande l'a suivie.
  const [fermeA, setFermeA] = useState(0)
  const demandes = demandesExternes + demandesLocales

  const ouvrir = useCallback(() => setDemandesLocales((n) => n + 1), [])
  const onOuvertChange = useCallback(
    (ouvert: boolean) => {
      if (!ouvert) setFermeA(demandes)
    },
    [demandes]
  )

  return {
    cle: demandes,
    monte: demandes > 0,
    ouvert: demandes > fermeA,
    ouvrir,
    onOuvertChange,
  }
}
