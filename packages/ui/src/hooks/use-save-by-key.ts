import { useCallback, useState } from "react"

export interface SaveByKeyEtat<R> {
  /** Le refus de chaque clé refusée, à afficher sous son champ. */
  refus: Readonly<Record<string, R>>
  /** La panne qui a arrêté l'enregistrement (bandeau), ou `null`. */
  panne: unknown
  enCours: boolean
  /** Tout est parti sans refus ni panne (« Enregistré »). */
  enregistre: boolean
  /**
   * Envoie chaque élément, dans l'ordre. `refusDe` lit le refus d'une
   * saisie (une erreur de validation), ou rend `null` pour une panne, qui
   * arrête l'enregistrement.
   */
  enregistrer: <E extends { cle: string }>(
    envois: readonly E[],
    envoyer: (envoi: E) => Promise<unknown>,
    refusDe: (erreur: unknown) => R | null
  ) => Promise<void>
  /** Une saisie change : son refus visait la précédente, et « Enregistré »
   *  ne vaut plus. Stable. */
  saisieChangee: (cle: string) => void
  /** Retire le refus d'une clé. Stable. */
  oublierRefus: (cle: string) => void
  /** « Annuler » : refus et panne disparaissent avec la saisie. Stable. */
  oublierTout: () => void
}

/**
 * L'enregistrement d'un formulaire de réglages dont chaque valeur part
 * seule (une requête par clé) : les clés modifiées partent l'une après
 * l'autre. Un refus de la saisie reste sous son champ et les suivantes
 * partent quand même ; une panne (réseau, serveur) arrête l'enregistrement
 * et s'affiche en bandeau. `R` : ce que le champ refusé affiche (l'erreur,
 * ou son message).
 *
 * ```tsx
 * const sauvegarde = useSaveByKey<string>()
 * await sauvegarde.enregistrer(
 *   modifiees, // [{ cle: "delai", valeur: 30 }, …]
 *   ({ cle, valeur }) => api.reglages.ecrire(cle, valeur),
 *   (erreur) => (estRefusDeSaisie(erreur) ? erreur.message : null)
 * )
 * <FormField erreur={sauvegarde.refus.delai} …>
 * <ErrorBanner erreur={sauvegarde.panne} />
 * <SaveBar enCours={sauvegarde.enCours} enregistre={sauvegarde.enregistre} … />
 * ```
 */
export function useSaveByKey<R>(): SaveByKeyEtat<R> {
  const [refus, setRefus] = useState<Readonly<Record<string, R>>>({})
  const [panne, setPanne] = useState<unknown>(null)
  const [enCours, setEnCours] = useState(false)
  const [enregistre, setEnregistre] = useState(false)

  async function enregistrer<E extends { cle: string }>(
    envois: readonly E[],
    envoyer: (envoi: E) => Promise<unknown>,
    refusDe: (erreur: unknown) => R | null
  ) {
    setEnCours(true)
    setPanne(null)
    setEnregistre(false)
    const refuses: Record<string, R> = {}
    let echec: unknown = null
    try {
      for (const envoi of envois) {
        try {
          await envoyer(envoi)
        } catch (erreur) {
          const motif = refusDe(erreur)
          if (motif === null) {
            echec = erreur
            break
          }
          refuses[envoi.cle] = motif
        }
      }
    } catch (erreur) {
      // Une lecture du refus qui lève : une panne, pas un formulaire
      // bloqué « en cours ».
      echec = erreur
    } finally {
      setRefus(refuses)
      setPanne(echec)
      setEnCours(false)
      setEnregistre(echec === null && Object.keys(refuses).length === 0)
    }
  }

  const oublierRefus = useCallback((cle: string) => {
    setRefus((avant) => {
      if (!(cle in avant)) return avant
      const reste = { ...avant }
      delete reste[cle]
      return reste
    })
  }, [])

  const saisieChangee = useCallback(
    (cle: string) => {
      setEnregistre(false)
      oublierRefus(cle)
    },
    [oublierRefus]
  )

  const oublierTout = useCallback(() => {
    setRefus({})
    setPanne(null)
  }, [])

  return {
    refus,
    panne,
    enCours,
    enregistre,
    enregistrer,
    saisieChangee,
    oublierRefus,
    oublierTout,
  }
}
