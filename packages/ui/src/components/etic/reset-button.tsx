import { useId } from "react"
import { cn } from "cn"
import { Undo2Icon } from "lucide-react"

import { useFormField } from "@etic-ui/components/etic/form-field-context"
import {
  TooltipButton,
  type TooltipButtonProps,
} from "@etic-ui/components/etic/tooltip-button"

export interface ResetButtonProps extends Omit<
  TooltipButtonProps,
  "onClick" | "children" | "infobulle" | "verrou"
> {
  /** La valeur rétablie, telle qu'elle s'affiche (« 6 », « 5 Mo »,
   *  « Hebdomadaire ») : l'infobulle dit « Rétablir la valeur par défaut :
   *  6 ». Sans elle, le bouton rétablit tout un formulaire. */
  valeur?: string
  /** Remplace l'infobulle et le nom accessible. */
  libelle?: string
  onRetablir: () => void
  /** La valeur est déjà celle par défaut : le bouton est invisible mais
   *  garde sa place (rien ne bouge autour quand il apparaît) et sort de
   *  l'ordre de tabulation. */
  masque?: boolean
  /**
   * Élément qui reçoit le focus au clic : l'identifiant d'un élément, ou
   * une fonction qui le renvoie. Par défaut, le contrôle du `FormField`
   * qui entoure le bouton. Le bouton se masque d'ordinaire dès que la
   * valeur est rétablie : sans cible, le focus tomberait sur la page.
   */
  cible?: string | (() => HTMLElement | null | undefined)
}

/**
 * Retour à la valeur par défaut d'un champ : une icône ↶, la valeur rétablie
 * dans l'infobulle. Dans un `FormField`, à passer à son `action` : il se
 * pose à droite du contrôle, et son nom accessible cite le libellé du champ
 * (« Rétablir la valeur par défaut (6) du champ Copies conservées »), pour
 * distinguer les boutons d'une même page. Toujours rendu, `masque` tant que
 * la valeur est celle par défaut. Au clic, le focus passe à la `cible`, puis
 * `onRetablir` est appelé.
 *
 * Sans `valeur`, c'est le bouton général d'un formulaire (« Rétablir toutes
 * les valeurs par défaut ») : voir `retablirDefauts` de `SaveBar`.
 */
export function ResetButton({
  valeur,
  libelle,
  onRetablir,
  masque = false,
  cible,
  variant = "ghost",
  size = "icon-sm",
  className,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: ResetButtonProps) {
  const champ = useFormField()
  const idTexte = useId()
  const infobulle =
    libelle ??
    (valeur === undefined
      ? "Rétablir toutes les valeurs par défaut"
      : `Rétablir la valeur par défaut : ${valeur}`)
  // Dans un champ, le nom cite son libellé : deux « Copies conservées » sur
  // la même page ne donnent pas deux boutons indiscernables.
  const nommeParLeChamp =
    champ !== null &&
    valeur !== undefined &&
    libelle === undefined &&
    ariaLabel === undefined &&
    ariaLabelledby === undefined

  const surClic = () => {
    const element =
      typeof cible === "function"
        ? cible()
        : document.getElementById(cible ?? champ?.id ?? "")
    element?.focus()
    onRetablir()
  }

  return (
    <>
      <TooltipButton
        type="button"
        variant={variant}
        size={size}
        infobulle={masque ? undefined : infobulle}
        aria-label={nommeParLeChamp ? undefined : (ariaLabel ?? infobulle)}
        aria-labelledby={
          nommeParLeChamp ? `${idTexte} ${champ.libelleId}` : ariaLabelledby
        }
        // `invisible` : ni survol, ni focus, ni lecteur d'écran, mais la
        // place reste.
        aria-hidden={masque || undefined}
        tabIndex={masque ? -1 : undefined}
        data-masque={masque || undefined}
        className={cn(
          variant === "ghost" && "text-muted-foreground",
          masque && "invisible",
          className
        )}
        onClick={surClic}
        {...props}
      >
        <Undo2Icon />
      </TooltipButton>
      {nommeParLeChamp ? (
        <span id={idTexte} hidden>
          {`Rétablir la valeur par défaut (${valeur}) du champ`}
        </span>
      ) : null}
    </>
  )
}
