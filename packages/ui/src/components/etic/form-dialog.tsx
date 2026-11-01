import {
  useRef,
  useState,
  type FormEvent,
  type ReactElement,
  type ReactNode,
} from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  Dialog,
  DialogBody,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@etic-ui/components/ui/dialog"
import {
  useAction,
  useOuvertureDialogue,
  type ActionDialogue,
} from "@etic-ui/components/etic/action"
import type { DialogFinalFocus } from "@etic-ui/components/etic/confirm-dialog"
import { ErrorBanner } from "@etic-ui/components/etic/error-banner"
import { TooltipButton } from "@etic-ui/components/etic/tooltip-button"
import {
  LARGEURS_DIALOGUE,
  type TailleDialogue,
} from "@etic-ui/components/etic/tailles-dialogue"

/**
 * Premier champ où l'on tape : ni case, ni bouton radio, ni fichier, ni
 * liste déroulante (elle a déjà une valeur valable), ni champ désactivé ou
 * en lecture seule, ni l'entrée cachée d'un `Select` ou d'un `Combobox` de
 * Base UI (`aria-hidden`, hors tabulation).
 */
const PREMIER_CHAMP = [
  'input:not([type="checkbox"]):not([type="radio"]):not([type="file"]):not([type="hidden"]):not([type="submit"]):not([type="button"])',
  "textarea",
]
  .map(
    (selecteur) =>
      `${selecteur}:not([disabled]):not([readonly]):not([tabindex="-1"]):not([aria-hidden="true"])`
  )
  .join(", ")

/** Affiché : ni `display: none` (classe `hidden`, panneau replié…) ni
 *  `visibility: hidden`, jusqu'à la racine. */
function estVisible(element: HTMLElement) {
  return typeof element.checkVisibility === "function"
    ? element.checkVisibility({ visibilityProperty: true })
    : element.getClientRects().length > 0
}

/** Premier élément affiché de `racine` qui répond à `accepte`. */
function premier(
  racine: HTMLElement | null,
  selecteur: string,
  accepte: (element: HTMLElement) => boolean = () => true
) {
  if (!racine) return null
  return (
    Array.from(racine.querySelectorAll<HTMLElement>(selecteur)).find(
      (element) => accepte(element) && estVisible(element)
    ) ?? null
  )
}

/**
 * À défaut de champ où l'on tape (cases seules, liste, choix segmenté…) :
 * le premier contrôle actif atteignable à la tabulation. Sans ce second
 * niveau, le focus allait à « Annuler ».
 */
function estTabulableActif(element: HTMLElement) {
  return (
    element.tabIndex >= 0 &&
    !element.matches(
      ':disabled, [data-disabled], [aria-disabled="true"], [readonly]'
    ) &&
    !element.closest('[aria-hidden="true"], [hidden], [inert]')
  )
}

/** Largeur du dialogue, selon la densité du formulaire. */
export type FormDialogTaille = TailleDialogue

type ChampValidable = HTMLElement & {
  willValidate: boolean
  validity: ValidityState
  validationMessage: string
  labels?: NodeListOf<HTMLLabelElement> | null
  name?: string
}

/** Ce qui ne va pas dans un champ, en français (la bulle native du
 *  navigateur parle sa langue, et l'erreur n'est pas reliée au champ). */
function raisonInvalide({ validity, validationMessage }: ChampValidable) {
  if (validity.valueMissing) return "obligatoire"
  if (validity.typeMismatch || validity.patternMismatch)
    return "format invalide"
  if (validity.tooShort) return "trop court"
  if (validity.tooLong) return "trop long"
  if (validity.rangeUnderflow) return "valeur trop petite"
  if (validity.rangeOverflow) return "valeur trop grande"
  if (validity.stepMismatch) return "valeur non permise"
  if (validity.badInput) return "valeur illisible"
  // Message posé par l'application (setCustomValidity), déjà dans sa langue.
  return validationMessage || "valeur invalide"
}

/** Texte d'un libellé, sans l'astérisque de RequiredMark. */
function texteDuLibelle(element: Element | null | undefined) {
  return element?.textContent?.replace(/\s*\*\s*$/, "").trim() || undefined
}

/**
 * Entrée cachée qui porte la valeur d'un composite (Select, Combobox de Base
 * UI, SearchSelect…) : ni libellé ni focus. Le champ visible est alors celui
 * que vise le libellé de son `FormField` (`[data-slot=field]` parent).
 */
function estCache(champ: ChampValidable) {
  return (
    champ.getAttribute("aria-hidden") === "true" ||
    champ.getAttribute("type") === "hidden" ||
    champ.tabIndex < 0
  )
}

function libelleDuField(champ: ChampValidable) {
  return champ
    .closest('[data-slot="field"]')
    ?.querySelector<HTMLLabelElement>('[data-slot="field-label"]')
}

/** Contrôle que voit l'utilisateur : le champ lui-même, ou pour une entrée
 *  cachée, le contrôle que vise le libellé de son `FormField`. */
function controleVisible(champ: ChampValidable): HTMLElement {
  if (!estCache(champ)) return champ
  const cible = libelleDuField(champ)?.htmlFor
  return (cible && document.getElementById(cible)) || champ
}

function nomDuChamp(champ: ChampValidable) {
  const visible = controleVisible(champ)
  const etiquettes = (visible as ChampValidable).labels ?? champ.labels
  const nomme =
    texteDuLibelle(etiquettes?.[0]) ||
    visible.getAttribute("aria-label")?.trim() ||
    texteDuLibelle(
      document.getElementById(
        visible.getAttribute("aria-labelledby")?.split(/\s+/)[0] ?? ""
      )
    ) ||
    texteDuLibelle(libelleDuField(champ))
  return nomme || champ.name || "Champ"
}

export interface FormDialogActionSecondaire {
  libelle: string
  /**
   * L'action. Elle ne ferme pas le dialogue d'elle-même. Si elle renvoie une
   * promesse, le dialogue l'attend comme un envoi (ce bouton occupé, les
   * autres et les champs figés, impossible à fermer) et affiche l'erreur en
   * tête du formulaire si elle échoue.
   */
  onChoisir: ActionDialogue
  /** Sortie qui détruit : grise, rouge au survol (comme `destructif` de
   *  `TooltipButton`). */
  destructif?: boolean
}

export interface FormDialogProps {
  titre: string
  description?: ReactNode
  /** Les champs du formulaire. */
  children: ReactNode
  /**
   * Envoi du formulaire (l'évènement a déjà son `preventDefault`), appelé
   * seulement si les contraintes des champs (`required`, `type`, `pattern`…)
   * sont tenues : sinon le dialogue liste en français les champs à corriger
   * et met le focus sur le premier. Si l'envoi renvoie une promesse, le
   * dialogue l'attend (champs et pied occupés, impossible à fermer), se ferme
   * quand elle aboutit et affiche l'erreur en tête du formulaire si elle
   * échoue. Sinon, il se ferme aussitôt. Renvoyer `false` (ou une promesse
   * résolue à `false`) le garde ouvert, sans erreur.
   */
  onEnvoyer: (event: FormEvent<HTMLFormElement>) => unknown
  /** « Enregistrer » par défaut. */
  libelleEnvoyer?: string
  /** « Annuler » par défaut : « Plus tard »… Le bouton ferme le dialogue. */
  libelleAnnuler?: string
  /**
   * Une troisième sortie, en tête du pied (à gauche sur ordinateur), discrète :
   * « Se déconnecter »… Indisponible comme « Annuler » pendant l'envoi. Elle
   * ne ferme pas le dialogue d'elle-même.
   */
  actionSecondaire?: FormDialogActionSecondaire
  /** Bouton d'envoi désactivé : formulaire incomplet, rien de modifié… */
  envoiDesactive?: boolean
  /** Envoi impossible, et pourquoi : le bouton reste focalisable et son
   *  infobulle donne la raison (voir `TooltipButton`). */
  verrouEnvoi?: string
  /** « md » par défaut ; « sm » pour un seul champ, « lg » ou « xl » pour
   *  un formulaire dense. */
  taille?: FormDialogTaille
  /** Ouverture contrôlée par l'application… */
  ouvert?: boolean
  onOuvertChange?: (ouvert: boolean) => void
  /** …ou bouton qui ouvre le dialogue, rendu à sa place. */
  declencheur?: ReactElement
  /** Où mettre le focus à la fermeture (voir `ConfirmDialog`). */
  finalFocus?: DialogFinalFocus
  className?: string
}

/**
 * Dialogue de création ou de modification, sur le `Dialog` de shadcn : un
 * formulaire, le pied « Annuler / Enregistrer », l'état d'envoi et l'erreur
 * d'envoi en tête. Il s'ouvre le curseur dans le premier champ à remplir.
 */
export function FormDialog({
  titre,
  description,
  children,
  onEnvoyer,
  libelleEnvoyer = "Enregistrer",
  libelleAnnuler = "Annuler",
  actionSecondaire,
  envoiDesactive = false,
  verrouEnvoi,
  taille = "md",
  ouvert,
  onOuvertChange,
  declencheur,
  finalFocus,
  className,
}: FormDialogProps) {
  const action = useAction()
  // Ce qui a lancé l'action en cours : l'envoi, ou l'action secondaire.
  const [lanceur, setLanceur] = useState<"envoi" | "secondaire">("envoi")
  const ouverture = useOuvertureDialogue(ouvert, onOuvertChange, action.enCours)
  const [invalides, setInvalides] = useState<{ nom: string; raison: string }[]>(
    []
  )
  const champs = useRef<HTMLFieldSetElement>(null)
  const boutonEnvoi = useRef<HTMLButtonElement>(null)
  // Contrôles visibles marqués `aria-invalid` par le dialogue (et non par
  // l'application), avec le champ dont ils portent la contrainte.
  const marques = useRef(new Map<HTMLElement, ChampValidable>())

  /** Retire la marque des champs redevenus valides (tous si `tout`). */
  const demarquer = (tout = false) => {
    for (const [visible, champ] of marques.current) {
      if (!tout && !champ.validity.valid) continue
      visible.removeAttribute("aria-invalid")
      marques.current.delete(visible)
    }
  }

  const envoyer = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (action.enCours || envoiDesactive || verrouEnvoi) return
    const form = event.currentTarget
    // `willValidate` écarte les boutons, les champs désactivés et les
    // `fieldset`, qui ne sont pas soumis aux contraintes.
    const fautifs = Array.from(form.elements).filter(
      (element): element is ChampValidable =>
        "willValidate" in element &&
        element.willValidate === true &&
        !(element as ChampValidable).validity.valid
    )
    setInvalides(
      fautifs.map((champ) => ({
        nom: nomDuChamp(champ),
        raison: raisonInvalide(champ),
      }))
    )
    demarquer(true)
    for (const champ of fautifs) {
      const visible = controleVisible(champ)
      // Un `aria-invalid` posé par l'application (FormField en erreur) reste
      // le sien : le dialogue ne le retirera pas.
      const dejaInvalide = ["true", "grammar", "spelling"].includes(
        visible.getAttribute("aria-invalid") ?? ""
      )
      if (dejaInvalide) continue
      visible.setAttribute("aria-invalid", "true")
      marques.current.set(visible, champ)
    }
    if (fautifs.length > 0) {
      controleVisible(fautifs[0]).focus()
      return
    }
    // Les champs sont désactivés pendant l'envoi : celui qui a le focus (Entrée
    // y envoie) le perdrait au profit de <body>. Il passe au bouton d'envoi,
    // occupé mais focalisable.
    if (champs.current?.contains(document.activeElement)) {
      boutonEnvoi.current?.focus()
    }
    setLanceur("envoi")
    void action.lancer(
      () => onEnvoyer(event),
      () => ouverture.definir(false)
    )
  }

  return (
    <Dialog
      open={ouverture.ouvert}
      onOpenChange={ouverture.changer}
      onOpenChangeComplete={(suivant) => {
        if (suivant) return
        action.reinitialiser()
        setInvalides([])
        demarquer(true)
      }}
    >
      {declencheur ? <DialogTrigger render={declencheur} /> : null}
      <DialogContent
        showCloseButton={false}
        className={cn(LARGEURS_DIALOGUE[taille], className)}
        initialFocus={() =>
          premier(champs.current, PREMIER_CHAMP) ??
          premier(champs.current, "*", estTabulableActif) ??
          true
        }
        finalFocus={finalFocus}
      >
        <DialogHeader>
          <DialogTitle>{titre}</DialogTitle>
          {description ? (
            <DialogDescription>{description}</DialogDescription>
          ) : null}
        </DialogHeader>
        <form
          onSubmit={envoyer}
          // Un champ corrigé perd sa marque dès la saisie (ou en sortant
          // d'un composite, dont l'entrée cachée n'émet rien).
          onInput={() => demarquer()}
          onChange={() => demarquer()}
          onBlur={() => demarquer()}
          noValidate
          aria-busy={action.enCours || undefined}
          // Peut rétrécir : seul le corps défile, le pied reste visible.
          className="flex min-h-0 flex-col gap-4"
        >
          <DialogBody>
            <ErrorBanner erreur={action.erreur} />
            <ErrorBanner
              erreur={invalides.length > 0}
              titre="Le formulaire est incomplet."
              description={
                <ul className="list-disc pl-4">
                  {invalides.map(({ nom, raison }, index) => (
                    <li key={index}>
                      {nom}&nbsp;: {raison}
                    </li>
                  ))}
                </ul>
              }
            />
            {/* Champs figés pendant l'envoi : une modification faite pendant
                l'attente serait perdue sans le savoir. */}
            <fieldset
              ref={champs}
              disabled={action.enCours}
              className="contents"
            >
              {children}
            </fieldset>
          </DialogBody>
          <DialogFooter>
            {actionSecondaire ? (
              // Sans cadre et rangée à part : elle ne répond pas au
              // formulaire, elle en sort.
              <TooltipButton
                variant="ghost"
                destructif={actionSecondaire.destructif}
                className="sm:mr-auto"
                disabled={action.enCours}
                focusableWhenDisabled
                enCours={action.enCours && lanceur === "secondaire"}
                onClick={() => {
                  if (action.enCours) return
                  setLanceur("secondaire")
                  void action.lancer(actionSecondaire.onChoisir)
                }}
              >
                {actionSecondaire.libelle}
              </TooltipButton>
            ) : null}
            <Button
              variant="outline"
              disabled={action.enCours}
              focusableWhenDisabled
              onClick={() => ouverture.changer(false)}
            >
              {libelleAnnuler}
            </Button>
            <TooltipButton
              ref={boutonEnvoi}
              type="submit"
              disabled={action.enCours || envoiDesactive}
              focusableWhenDisabled
              verrou={verrouEnvoi}
              enCours={action.enCours && lanceur === "envoi"}
            >
              {libelleEnvoyer}
            </TooltipButton>
          </DialogFooter>
        </form>
        {/* La croix de shadcn, occupée comme « Annuler » pendant l'envoi. */}
        <Button
          variant="ghost"
          size="icon-sm"
          data-slot="dialog-close"
          className="absolute top-2 right-2"
          disabled={action.enCours}
          focusableWhenDisabled
          onClick={() => ouverture.changer(false)}
        >
          <XIcon />
          <span className="sr-only">Fermer</span>
        </Button>
      </DialogContent>
    </Dialog>
  )
}
