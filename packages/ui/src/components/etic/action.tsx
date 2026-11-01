import { useCallback, useState } from "react"

/**
 * Action d'un dialogue : synchrone, ou une promesse que le dialogue attend.
 * Renvoyer `false` (ou une promesse résolue à `false`) garde le dialogue
 * ouvert, sans erreur : la page change sa question (« Supprimer quand
 * même ? ») ou signale elle-même ce qui manque.
 */
export type ActionDialogue = () => unknown

/**
 * État d'une action lancée depuis un dialogue. `lancer` appelle l'action :
 * si elle renvoie une promesse, `enCours` vaut vrai jusqu'à son issue. Puis
 * `succes`, s'il est donné, est appelé, sauf si l'action a renvoyé `false`
 * (une action qui ne ferme rien n'en passe pas) ; en cas d'échec,
 * `erreur` reçoit la raison. Une action synchrone qui lève une exception
 * échoue de même.
 */
export function useAction() {
  const [enCours, setEnCours] = useState(false)
  const [erreur, setErreur] = useState<unknown>(null)

  const lancer = useCallback(
    async (action: ActionDialogue, succes?: () => void) => {
      setErreur(null)
      setEnCours(true)
      let resultat: unknown
      try {
        resultat = await action()
      } catch (raison) {
        // Une promesse rejetée sans raison doit tout de même s'afficher.
        setErreur(raison ?? new Error("L'action a échoué. Réessayez."))
        setEnCours(false)
        return
      }
      setEnCours(false)
      if (resultat !== false) succes?.()
    },
    []
  )

  const reinitialiser = useCallback(() => {
    setErreur(null)
    setEnCours(false)
  }, [])

  return { enCours, erreur, lancer, reinitialiser }
}

/**
 * Ouverture d'un dialogue, contrôlée (`ouvert`, `onOuvertChange`) ou
 * interne. Pendant l'action, toute demande de fermeture (Échap, Annuler,
 * croix, clic sur le voile) est ignorée.
 */
export function useOuvertureDialogue(
  ouvert: boolean | undefined,
  onOuvertChange: ((ouvert: boolean) => void) | undefined,
  enCours: boolean
) {
  const [ouvertInterne, setOuvertInterne] = useState(false)
  const definir = (suivant: boolean) => {
    setOuvertInterne(suivant)
    onOuvertChange?.(suivant)
  }
  return {
    ouvert: ouvert ?? ouvertInterne,
    definir,
    changer: fermerSaufEnCours(enCours, definir),
  }
}

/**
 * `onOpenChange` d'un dialogue composé à la main qui ne se ferme pas pendant
 * son action (Échap, clic sur le voile, croix, « Annuler ») : le fermer ne
 * l'arrêterait pas, elle aboutirait après coup. Toute demande d'ouverture
 * (`DialogTrigger`) passe, et une fermeture hors de l'action aussi :
 * `onOpenChange={fermerSaufEnCours(enCours, setOuvert)}`. `ConfirmDialog` et
 * `FormDialog` le font d'eux-mêmes.
 */
export function fermerSaufEnCours(
  enCours: boolean,
  onOuvertChange: (ouvert: boolean) => void
): (ouvert: boolean) => void {
  return (suivant) => {
    if (suivant || !enCours) onOuvertChange(suivant)
  }
}
