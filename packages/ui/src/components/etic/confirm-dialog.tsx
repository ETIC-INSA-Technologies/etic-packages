import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@etic-ui/components/ui/alert-dialog"
import { Button } from "@etic-ui/components/ui/button"
import { Field, FieldLabel } from "@etic-ui/components/ui/field"
import { Input } from "@etic-ui/components/ui/input"
import {
  SpinnerBouton,
  useAction,
  useOuvertureDialogue,
  type ActionDialogue,
} from "@etic-ui/components/etic/action"
import { ErrorBanner } from "@etic-ui/components/etic/error-banner"

/**
 * Garde renforcée des actions les plus graves : le bouton de confirmation
 * reste désactivé tant que la personne n'a pas saisi `attendu`, que le
 * dialogue n'affiche pas (le nombre d'éléments sélectionnés, lu ailleurs à
 * l'écran, ou le nom de ce qui sera détruit).
 */
export interface ConfirmDialogSaisie {
  attendu: string
  /** Consigne au-dessus du champ : « Saisissez le nombre de… ». */
  libelle: string
  /** Affiché quand la saisie, aussi longue que la réponse, est fausse. */
  messageErreur: string
  /** Clavier numérique sur téléphone. */
  numerique?: boolean
}

/** Où va le focus à la fermeture : celui du `Popup` de Base UI. */
export type DialogFinalFocus = ComponentProps<
  typeof AlertDialogContent
>["finalFocus"]

export interface ConfirmDialogProps {
  /** Le titre nomme l'action : « Supprimer le groupe ». */
  titre: string
  /** La phrase qui nomme ce qui va changer ou être détruit. */
  description: ReactNode
  /** Sous la description : liste des éléments touchés, conséquences… */
  children?: ReactNode
  /** « Confirmer » par défaut. */
  libelleConfirmer?: string
  /** Bouton de confirmation rouge ; vrai par défaut. */
  destructif?: boolean
  saisie?: ConfirmDialogSaisie
  /**
   * L'action confirmée. Si elle renvoie une promesse, le dialogue l'attend
   * (boutons occupés, impossible à fermer, le focus reste sur le bouton), se
   * ferme quand elle aboutit et affiche l'erreur si elle échoue. Sinon, il se
   * ferme aussitôt. Si elle renvoie `false` (ou une promesse résolue à
   * `false`), il reste ouvert sans erreur : suppression en deux temps, où la
   * page change sa question (« Supprimer quand même »).
   */
  onConfirmer: ActionDialogue
  /** Ouverture contrôlée par l'application… */
  ouvert?: boolean
  onOuvertChange?: (ouvert: boolean) => void
  /** …ou bouton qui ouvre le dialogue, rendu à sa place. */
  declencheur?: ReactElement
  /**
   * Où mettre le focus à la fermeture (`finalFocus` de Base UI : un ref, ou
   * une fonction). Par défaut, le déclencheur ; à fournir quand l'action le
   * fait disparaître (ligne supprimée) : la ligne suivante, le titre de la
   * liste…
   */
  finalFocus?: DialogFinalFocus
  className?: string
}

/**
 * Confirmation d'une action, sur l'`AlertDialog` de shadcn : le titre nomme
 * l'action, la description ce qu'elle touche, et l'erreur de l'action
 * s'affiche dans le dialogue, resté ouvert (un bandeau dans la page, derrière
 * le voile, passerait inaperçu). `saisie` exige en plus de taper une valeur
 * pour les actions critiques.
 */
export function ConfirmDialog({
  titre,
  description,
  children,
  libelleConfirmer = "Confirmer",
  destructif = true,
  saisie,
  onConfirmer,
  ouvert,
  onOuvertChange,
  declencheur,
  finalFocus,
  className,
}: ConfirmDialogProps) {
  const [saisi, setSaisi] = useState("")
  const action = useAction()
  const ouverture = useOuvertureDialogue(ouvert, onOuvertChange, action.enCours)
  const champ = useRef<HTMLInputElement>(null)
  const idChamp = useId()
  const idErreur = useId()

  const valeur = saisi.trim()
  const correct = !saisie || valeur === saisie.attendu
  // Pas de rouge tant que la saisie est plus courte que la réponse : le
  // premier de deux chiffres n'est pas une erreur.
  const faux = !!saisie && !correct && valeur.length >= saisie.attendu.length
  const peutConfirmer = correct && !action.enCours

  const confirmer = () => {
    if (!peutConfirmer) return
    void action.lancer(onConfirmer, () => ouverture.definir(false))
  }

  return (
    <AlertDialog
      open={ouverture.ouvert}
      onOpenChange={ouverture.changer}
      onOpenChangeComplete={(suivant) => {
        if (suivant) return
        setSaisi("")
        action.reinitialiser()
      }}
    >
      {declencheur ? <AlertDialogTrigger render={declencheur} /> : null}
      <AlertDialogContent
        initialFocus={saisie ? champ : undefined}
        finalFocus={finalFocus}
        className={className}
      >
        <AlertDialogHeader>
          <AlertDialogTitle>{titre}</AlertDialogTitle>
          {/* Région polie : une description changée pendant l'ouverture
              (suppression en deux temps) est lue ; celle de l'ouverture est
              lue avec le dialogue, qu'elle décrit. */}
          <AlertDialogDescription aria-live="polite">
            {description}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <ErrorBanner erreur={action.erreur} />
        {children}
        {saisie ? (
          <Field data-invalid={faux || undefined}>
            <FieldLabel htmlFor={idChamp}>{saisie.libelle}</FieldLabel>
            <Input
              ref={champ}
              id={idChamp}
              name="confirmation"
              type="text"
              inputMode={saisie.numerique ? "numeric" : undefined}
              autoComplete="off"
              spellCheck={false}
              value={saisi}
              // En lecture seule plutôt que désactivé pendant l'action : un
              // champ désactivé perdrait le focus (Entrée confirme d'ici).
              readOnly={action.enCours}
              aria-invalid={faux || undefined}
              aria-describedby={faux ? idErreur : undefined}
              onChange={(event) => setSaisi(event.target.value)}
              onKeyDown={(event) => {
                if (event.key !== "Enter") return
                event.preventDefault()
                confirmer()
              }}
            />
            {/* Zone montée en permanence, polie : l'erreur apparaît pendant
                la frappe, une alerte la couperait. */}
            <div
              id={idErreur}
              data-slot="field-error"
              aria-live="polite"
              className="text-sm font-normal text-destructive empty:hidden"
            >
              {faux ? saisie.messageErreur : null}
            </div>
          </Field>
        ) : null}
        <AlertDialogFooter>
          {/* Boutons occupés mais focalisables pendant l'action : un bouton
              désactivé nativement perdrait le focus au profit de <body>. */}
          <Button
            variant="outline"
            disabled={action.enCours}
            focusableWhenDisabled
            onClick={() => ouverture.changer(false)}
          >
            Annuler
          </Button>
          <AlertDialogAction
            variant={destructif ? "destructive" : "default"}
            disabled={!peutConfirmer}
            focusableWhenDisabled
            aria-busy={action.enCours || undefined}
            onClick={confirmer}
          >
            {action.enCours ? <SpinnerBouton /> : null}
            {libelleConfirmer}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
