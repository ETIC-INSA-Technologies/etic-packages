import { useEffectEvent, useId, useLayoutEffect, useState } from "react"
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
  onRetablir: () => void
  /** La valeur est déjà celle par défaut : le bouton est invisible mais
   *  garde sa place (rien ne bouge autour quand il apparaît) et sort de
   *  l'ordre de tabulation. */
  masque?: boolean
  /** Identifiant du libellé que le nom accessible cite (« … du champ
   *  Cadence ») : par défaut, celui du `FormField` qui entoure le bouton.
   *  Pour un champ hors `FormField` (`FieldSet` et sa `FieldLegend`). */
  libelleId?: string
  /**
   * Élément qui reçoit le focus une fois la valeur rétablie : son
   * identifiant, ou une fonction qui le renvoie. Par défaut, le contrôle du
   * `FormField` qui entoure le bouton. Un groupe (boutons joints, cases)
   * donne le focus à son option choisie. Le bouton se masque d'ordinaire
   * avec l'écart : sans cible, le focus tomberait sur la page.
   */
  cible?: string | (() => HTMLElement | null | undefined)
}

const FOCALISABLE =
  "input:not([disabled]), select:not([disabled]), textarea:not([disabled]), button:not([disabled]), a[href], [tabindex]:not([tabindex='-1'])"

/** Ce qui prend le focus dans `cible` : elle-même si elle le peut ; dans un
 *  groupe, l'option choisie, sinon le premier élément focalisable. */
function focalisableDans(cible: HTMLElement): HTMLElement {
  if (cible.matches(FOCALISABLE)) return cible
  return (
    cible.querySelector<HTMLElement>(
      '[aria-pressed="true"], [aria-checked="true"]'
    ) ??
    cible.querySelector<HTMLElement>(FOCALISABLE) ??
    cible
  )
}

/**
 * Retour à la valeur par défaut d'un champ : une icône ↶, la valeur rétablie
 * dans l'infobulle. Dans un `FormField`, à passer à son `action` : il se
 * pose à droite du contrôle, et son nom accessible cite le libellé du champ
 * (« Rétablir la valeur par défaut (6) du champ Copies conservées »), pour
 * distinguer les boutons d'une même page ; ailleurs, `libelleId` et
 * `cible` disent quel libellé citer et qui reçoit le focus. Toujours rendu,
 * `masque` tant que la valeur est celle par défaut.
 *
 * Sans `valeur`, c'est le bouton général d'un formulaire (« Rétablir toutes
 * les valeurs par défaut ») : voir `retablirDefauts` de `SaveBar`.
 */
export function ResetButton({
  valeur,
  onRetablir,
  masque = false,
  libelleId,
  cible,
  variant = "ghost",
  size = "icon-sm",
  className,
  id,
  "aria-label": ariaLabel,
  "aria-labelledby": ariaLabelledby,
  ...props
}: ResetButtonProps) {
  const champ = useFormField()
  const genere = useId()
  const idBouton = id ?? genere
  const infobulle =
    valeur === undefined
      ? "Rétablir toutes les valeurs par défaut"
      : `Rétablir la valeur par défaut : ${valeur}`
  // Le nom cite le libellé du champ : deux « Copies conservées » sur la même
  // page ne donnent pas deux boutons indiscernables. Le bouton se cite
  // lui-même (son `aria-label`), puis le libellé : aucun texte caché.
  const libelleCite = libelleId ?? champ?.libelleId
  const nommeParLeChamp =
    valeur !== undefined &&
    libelleCite !== undefined &&
    ariaLabel === undefined &&
    ariaLabelledby === undefined

  // Le focus part une fois la valeur rétablie à l'écran (l'option choisie
  // d'un groupe est alors celle du défaut), avant que le navigateur ne
  // peigne le bouton masqué. Le bouton reste monté : l'effet suit chaque clic.
  const [clics, setClics] = useState(0)
  const focaliser = useEffectEvent(() => {
    const element =
      typeof cible === "function"
        ? cible()
        : document.getElementById(cible ?? champ?.id ?? "")
    if (element) focalisableDans(element).focus()
  })
  useLayoutEffect(() => {
    if (clics > 0) focaliser()
  }, [clics])

  const surClic = () => {
    setClics((n) => n + 1)
    onRetablir()
  }

  return (
    <TooltipButton
      // D'abord : les attributs calculés ci-dessous (masque, nom, clic)
      // l'emportent sur ceux de l'appelant.
      {...props}
      type="button"
      id={idBouton}
      variant={variant}
      size={size}
      infobulle={masque ? undefined : infobulle}
      aria-label={
        nommeParLeChamp
          ? `Rétablir la valeur par défaut (${valeur}) du champ`
          : (ariaLabel ?? infobulle)
      }
      aria-labelledby={
        nommeParLeChamp ? `${idBouton} ${libelleCite}` : ariaLabelledby
      }
      // `invisible` : ni survol, ni focus, ni lecteur d'écran, mais la
      // place reste.
      aria-hidden={masque || undefined}
      tabIndex={masque ? -1 : undefined}
      className={cn(
        variant === "ghost" && "text-muted-foreground",
        masque && "invisible",
        className
      )}
      onClick={surClic}
    >
      <Undo2Icon />
    </TooltipButton>
  )
}
