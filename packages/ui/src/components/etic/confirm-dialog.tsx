import {
  useId,
  useRef,
  useState,
  type ComponentProps,
  type ReactElement,
  type ReactNode,
} from "react"
import { cn } from "cn"

import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@etic-ui/components/ui/alert-dialog"
import { Button } from "@etic-ui/components/ui/button"
import { DialogBody } from "@etic-ui/components/ui/dialog"
import { Field, FieldLabel } from "@etic-ui/components/ui/field"
import { Input } from "@etic-ui/components/ui/input"
import {
  useAction,
  useOuvertureDialogue,
  type ActionDialogue,
} from "@etic-ui/components/etic/action"
import { ErrorBanner } from "@etic-ui/components/etic/error-banner"
import { TooltipButton } from "@etic-ui/components/etic/tooltip-button"
import {
  LARGEURS_DIALOGUE,
  type TailleDialogue,
} from "@etic-ui/components/etic/tailles-dialogue"
import { NO_AUTOFILL } from "@etic-ui/lib/autofill"

/**
 * Garde renforcée des actions les plus graves : le bouton de confirmation
 * reste désactivé tant que la personne n'a pas saisi `attendu`, que le
 * dialogue n'affiche pas (le nombre d'éléments sélectionnés, lu ailleurs à
 * l'écran, ou le nom de ce qui sera détruit). Si `attendu` change pendant
 * l'ouverture (le nombre d'éléments a changé côté serveur), la saisie est
 * vidée : l'ancienne réponse ne vaut plus.
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

/** Largeur du dialogue : « sm » (celle de l'`AlertDialog` de shadcn), « md »
 *  ou « lg » pour un récapitulatif. */
export type ConfirmDialogTaille = Exclude<TailleDialogue, "xl">

export interface ConfirmDialogProps {
  /** Le titre nomme l'action : « Supprimer le groupe ». */
  titre: string
  /** La phrase qui nomme ce qui va changer ou être détruit. */
  description: ReactNode
  /**
   * Les éléments concernés (noms des comptes, des fichiers…), en liste à
   * puces sous la description, qui défile au-delà d'une dizaine de lignes.
   * Éléments sans état ; la liste est rendue par position.
   */
  elements?: readonly ReactNode[]
  /** Nom accessible de la liste `elements` : « Comptes à désactiver ». */
  libelleElements?: string
  /** Sous la description (et `elements`) : conséquences, compléments… */
  children?: ReactNode
  /** « Confirmer » par défaut. */
  libelleConfirmer?: string
  /** « Annuler » par défaut : « Revenir au tableau »… */
  libelleAnnuler?: string
  /** Bouton de confirmation rouge ; vrai par défaut. */
  destructif?: boolean
  /**
   * Confirmation impossible, et pourquoi (conséquences en cours de
   * chargement, erreurs à corriger…) : le bouton reste focalisable, grisé, et
   * son infobulle donne la raison (voir `TooltipButton`).
   */
  verrou?: string
  /** « sm » par défaut. */
  taille?: ConfirmDialogTaille
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
  /**
   * Appelé quand la personne renonce (« Annuler » ou Échap ; un clic hors
   * d'un `AlertDialog` ne le ferme pas), et seulement alors :
   * `onOuvertChange(false)` suit aussi une confirmation réussie.
   */
  onAnnuler?: () => void
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
  elements,
  libelleElements = "Éléments concernés",
  children,
  libelleConfirmer = "Confirmer",
  libelleAnnuler = "Annuler",
  destructif = true,
  verrou,
  taille = "sm",
  saisie,
  onConfirmer,
  onAnnuler,
  ouvert,
  onOuvertChange,
  declencheur,
  finalFocus,
  className,
}: ConfirmDialogProps) {
  // La saisie vaut pour la réponse attendue au moment de la frappe : si
  // `attendu` change pendant l'ouverture, elle se lit vide, sans remonter le
  // dialogue (le focus reste dans le champ, l'état de l'action est gardé).
  const [saisi, setSaisi] = useState({ attendu: saisie?.attendu, valeur: "" })
  const texte = saisi.attendu === saisie?.attendu ? saisi.valeur : ""
  const action = useAction()
  const ouverture = useOuvertureDialogue(ouvert, onOuvertChange, action.enCours)
  const champ = useRef<HTMLInputElement>(null)
  const idChamp = useId()
  const idErreur = useId()

  /** Fermeture demandée par la personne (et non par la réussite). */
  const changer = (suivant: boolean) => {
    if (!suivant && !action.enCours) onAnnuler?.()
    ouverture.changer(suivant)
  }

  const valeur = texte.trim()
  const correct = !saisie || valeur === saisie.attendu
  // Pas de rouge tant que la saisie est plus courte que la réponse : le
  // premier de deux chiffres n'est pas une erreur.
  const faux = !!saisie && !correct && valeur.length >= saisie.attendu.length
  const peutConfirmer = correct && !verrou && !action.enCours
  // Corps rendu dès qu'il a un contenu possible ; avec `saisie`, il est
  // toujours là, et l'apparition d'une erreur ne remonte pas le champ.
  const aUnCorps =
    action.erreur != null ||
    (elements?.length ?? 0) > 0 ||
    (children != null && children !== false) ||
    !!saisie

  const confirmer = () => {
    if (!peutConfirmer) return
    void action.lancer(onConfirmer, () => ouverture.definir(false))
  }

  return (
    <AlertDialog
      open={ouverture.ouvert}
      onOpenChange={changer}
      onOpenChangeComplete={(suivant) => {
        if (suivant) return
        setSaisi({ attendu: saisie?.attendu, valeur: "" })
        action.reinitialiser()
      }}
    >
      {declencheur ? <AlertDialogTrigger render={declencheur} /> : null}
      <AlertDialogContent
        initialFocus={saisie ? champ : undefined}
        finalFocus={finalFocus}
        className={cn(LARGEURS_DIALOGUE[taille], className)}
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
        {aUnCorps ? (
          // Seul le corps défile : titre et pied restent visibles.
          <DialogBody>
            <ErrorBanner erreur={action.erreur} />
            {elements && elements.length > 0 ? (
              // Défilante, sans arrêt de tabulation : les navigateurs rendent
              // eux-mêmes focalisable au clavier une zone qui défile. Une
              // adresse sans espace passe à la ligne au lieu de déborder.
              <ul
                aria-label={libelleElements}
                className="max-h-48 list-disc overflow-y-auto pl-5 text-sm wrap-anywhere"
              >
                {elements.map((element, index) => (
                  <li key={index}>{element}</li>
                ))}
              </ul>
            ) : null}
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
                  // Ni identifiant ni mot de passe : les gestionnaires s'abstiennent.
                  {...NO_AUTOFILL}
                  spellCheck={false}
                  value={texte}
                  // En lecture seule plutôt que désactivé pendant l'action : un
                  // champ désactivé perdrait le focus (Entrée confirme d'ici).
                  readOnly={action.enCours}
                  aria-invalid={faux || undefined}
                  aria-describedby={faux ? idErreur : undefined}
                  onChange={(event) =>
                    setSaisi({
                      attendu: saisie.attendu,
                      valeur: event.target.value,
                    })
                  }
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
          </DialogBody>
        ) : null}
        <AlertDialogFooter>
          {/* Boutons occupés mais focalisables pendant l'action : un bouton
              désactivé nativement perdrait le focus au profit de <body>. */}
          <Button
            variant="outline"
            disabled={action.enCours}
            focusableWhenDisabled
            onClick={() => changer(false)}
          >
            {libelleAnnuler}
          </Button>
          <TooltipButton
            data-slot="alert-dialog-action"
            variant={destructif ? "destructive" : "default"}
            disabled={!peutConfirmer}
            focusableWhenDisabled
            verrou={verrou}
            enCours={action.enCours}
            onClick={confirmer}
          >
            {libelleConfirmer}
          </TooltipButton>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
