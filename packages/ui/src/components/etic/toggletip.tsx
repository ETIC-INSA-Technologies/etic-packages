import {
  cloneElement,
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
  type Ref,
} from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { cn } from "cn"

import { Popover } from "@etic-ui/components/ui/popover"
import { CLASSES_BULLE, CLASSES_FLECHE } from "@etic-ui/components/ui/tooltip"
import { useOuvertureAuFocusClavier } from "@etic-ui/lib/navigation-clavier"

/** Props que reçoit l'élément porteur. */
type PropsPorteur = HTMLAttributes<HTMLElement> & {
  ref?: Ref<HTMLElement>
  "data-slot"?: string
}

export interface ToggletipProps {
  /** L'explication : bulle au toucher, au clic, au survol et au focus
   *  clavier, et texte lu par les lecteurs d'écran. */
  explication: string
  /** Ce qui porte l'explication : un badge, une date, un mot. */
  children: ReactNode
  /** Élément qui porte la bulle : `<span />` par défaut (`<time dateTime=…
   *  />` pour une date, par exemple). Il reçoit `tabIndex={0}`, sauf s'il en
   *  a déjà un, et les gestionnaires de la bulle. */
  render?: ReactElement<PropsPorteur>
  /** Texte lu après le contenu ; « : explication » par défaut. */
  texteLu?: string
  /** Classes de l'élément focalisable (sa forme, pour l'anneau de focus). */
  className?: string
  /** `data-slot` de l'élément focalisable ; « toggletip » par défaut. */
  "data-slot"?: string
}

/** Ce qui a ouvert la bulle : le survol et le focus la referment en
 *  partant, un clic la garde jusqu'au suivant. */
type Ouverture = "survol" | "focus" | "clic" | null

/**
 * Explication d'un élément qui n'est pas une action (badge, date, sigle),
 * dans une bulle `Popover` à l'allure d'une infobulle : elle s'ouvre au
 * toucher et au clic (une infobulle de Base UI ne s'ouvre pas au toucher),
 * au survol de la souris et au focus d'une navigation au clavier ; elle se
 * ferme au toucher ou au clic ailleurs (ou sur l'élément), à Échap, et quand
 * le focus s'en va. Les lecteurs d'écran lisent l'explication à la suite du
 * contenu (`texteLu`) : l'élément reste un texte (ni rôle de bouton, ni
 * `aria-expanded`), et la bulle, qui la répète, leur est masquée.
 *
 * Pour un bouton qui a une action, une infobulle (`TooltipButton`) reste de
 * mise : le toucher y déclenche l'action.
 */
export function Toggletip({
  explication,
  children,
  render = <span />,
  texteLu = ` : ${explication}`,
  className,
  "data-slot": slot = "toggletip",
}: ToggletipProps) {
  const [ouverture, setOuverture] = useState<Ouverture>(null)
  // L'élément porteur, ancre de la bulle (en état : un ref lu au rendu ne
  // suivrait pas son montage).
  const [porteur, setPorteur] = useState<HTMLElement | null>(null)
  const parNavigation = useOuvertureAuFocusClavier()
  const fermerSi = (origines: Ouverture[]) =>
    setOuverture((actuelle) => (origines.includes(actuelle) ? null : actuelle))

  const element = cloneElement(
    render,
    {
      ref: setPorteur,
      "data-slot": slot,
      // Atteignable au clavier même quand l'application fournit son élément
      // (`<time>` n'est pas focalisable de lui-même).
      tabIndex: render.props.tabIndex ?? 0,
      className: cn(
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        render.props.className,
        className
      ),
      onClick: () =>
        // Ouverte au survol ou au focus, le clic la garde ; ouverte au clic,
        // il la ferme.
        setOuverture((actuelle) => (actuelle === "clic" ? null : "clic")),
      onPointerEnter: (event) => {
        if (event.pointerType === "mouse")
          setOuverture((actuelle) => actuelle ?? "survol")
      },
      onPointerLeave: (event) => {
        if (event.pointerType === "mouse") fermerSi(["survol"])
      },
      onFocus: () => {
        if (parNavigation()) setOuverture((actuelle) => actuelle ?? "focus")
      },
      onBlur: () => setOuverture(null),
      // Échap ferme la bulle seule, pas le dialogue qui l'entoure.
      onKeyDown: (event) => {
        if (event.key === "Escape" && ouverture) {
          event.stopPropagation()
          setOuverture(null)
        }
      },
    } satisfies PropsPorteur,
    children,
    <span className="sr-only">{texteLu}</span>
  )

  return (
    <>
      {element}
      <Popover
        open={ouverture !== null}
        onOpenChange={(ouvert, details) => {
          if (ouvert) return
          // Un clic sur l'élément lui-même est traité par son `onClick`.
          const cible = details.event?.target
          if (
            details.reason === "outside-press" &&
            cible instanceof Node &&
            porteur?.contains(cible)
          )
            return
          setOuverture(null)
        }}
      >
        <PopoverPrimitive.Portal>
          <PopoverPrimitive.Positioner
            anchor={porteur}
            side="top"
            sideOffset={4}
            className="isolate z-50"
          >
            <PopoverPrimitive.Popup
              data-slot="toggletip-content"
              // Le focus reste sur l'élément : la bulle ne contient rien à
              // atteindre, et répète ce que lisent les lecteurs d'écran.
              initialFocus={false}
              finalFocus={false}
              aria-hidden
              className={CLASSES_BULLE}
            >
              {explication}
              <PopoverPrimitive.Arrow className={CLASSES_FLECHE} />
            </PopoverPrimitive.Popup>
          </PopoverPrimitive.Positioner>
        </PopoverPrimitive.Portal>
      </Popover>
    </>
  )
}
