import { useState, type ReactNode } from "react"

import { Button } from "@etic-ui/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@etic-ui/components/ui/dialog"
import {
  SpinnerBouton,
  useAction,
  useOuvertureDialogue,
  type ActionDialogue,
} from "@etic-ui/components/etic/action"
import { ErrorBanner } from "@etic-ui/components/etic/error-banner"
import { LARGEURS_DIALOGUE } from "@etic-ui/components/etic/tailles-dialogue"

export interface DraftResumeDialogProps {
  titre: string
  /** La phrase qui situe le brouillon : quoi, quand, par qui. */
  description: ReactNode
  /** Ce que la personne peut faire du brouillon, en clair. */
  children?: ReactNode
  /**
   * Le brouillon se reprend (ni terminé, ni préparé pour un autre
   * contexte) : sans cela, « Reprendre au même point » n'est pas proposé.
   */
  reprenable: boolean
  /** Libellé du bouton qui supprime le brouillon : « Repartir de zéro »… */
  libelleRepartir: string
  onReprendre: () => void
  /**
   * Supprime le brouillon. Si elle renvoie une promesse, le dialogue
   * l'attend (bouton occupé, impossible à fermer) et affiche l'erreur si elle
   * échoue. À l'application de fermer le dialogue ensuite (`ouvert`, ou en le
   * démontant), comme pour `onReprendre` et `onQuitter`.
   */
  onRepartir: ActionDialogue
  /** « Quitter » ou Échap : jamais pendant la suppression. */
  onQuitter: () => void
  /**
   * Échec d'une suppression lancée hors du dialogue (purge automatique d'un
   * brouillon périmé…), affiché comme celui de `onRepartir`, jusqu'à ce que
   * la personne relance la suppression d'ici.
   */
  erreur?: unknown
  /** Vrai par défaut : l'application le monte quand un brouillon existe. */
  ouvert?: boolean
}

/**
 * Dialogue d'ouverture d'un utilitaire à brouillon (compagnon de
 * `useDraftAutosave`) : un brouillon existe, la personne le reprend au même
 * point, repart de zéro (suppression du brouillon) ou quitte. L'application
 * dit ce qu'est son brouillon (titre, description, corps) ; la mécanique est
 * la même partout.
 */
export function DraftResumeDialog({
  titre,
  description,
  children,
  reprenable,
  libelleRepartir,
  onReprendre,
  onRepartir,
  onQuitter,
  erreur,
  ouvert = true,
}: DraftResumeDialogProps) {
  const action = useAction()
  // L'échec venu d'ailleurs ne vaut que tant que la personne n'a pas relancé
  // la suppression d'ici : ensuite, seule l'issue de son action compte.
  const [relancee, setRelancee] = useState(false)
  const echec = relancee ? action.erreur : (action.erreur ?? erreur)
  // Échap et « Quitter » demandent la fermeture : refusée pendant la
  // suppression, qui aboutirait après coup ; sinon, quitter.
  const ouverture = useOuvertureDialogue(
    ouvert,
    (suivant) => {
      if (!suivant) onQuitter()
    },
    action.enCours
  )

  return (
    <Dialog
      open={ouverture.ouvert}
      onOpenChange={ouverture.changer}
      onOpenChangeComplete={(suivant) => {
        if (suivant) return
        action.reinitialiser()
        setRelancee(false)
      }}
    >
      {/* Sans croix : « Quitter » la remplace, et dit son état pendant la
          suppression. */}
      <DialogContent showCloseButton={false} className={LARGEURS_DIALOGUE.md}>
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        {echec != null || children ? (
          <DialogBody className="gap-3 text-sm">
            <ErrorBanner
              erreur={echec}
              titre="Échec de la suppression du brouillon."
            />
            {children}
          </DialogBody>
        ) : null}
        <DialogFooter>
          {/* Occupés mais focalisables pendant la suppression : un bouton
              désactivé nativement perdrait le focus au profit de <body>. */}
          <Button
            variant="outline"
            disabled={action.enCours}
            focusableWhenDisabled
            onClick={() => ouverture.changer(false)}
          >
            Quitter
          </Button>
          <Button
            variant="destructive"
            disabled={action.enCours}
            focusableWhenDisabled
            aria-busy={action.enCours || undefined}
            onClick={() => {
              setRelancee(true)
              void action.lancer(onRepartir, () => {})
            }}
          >
            {action.enCours ? <SpinnerBouton /> : null}
            {libelleRepartir}
          </Button>
          {reprenable ? (
            <Button
              disabled={action.enCours}
              focusableWhenDisabled
              onClick={onReprendre}
            >
              Reprendre au même point
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
