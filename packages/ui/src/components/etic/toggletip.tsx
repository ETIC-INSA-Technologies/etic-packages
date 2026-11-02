import {
  useState,
  type HTMLAttributes,
  type ReactElement,
  type ReactNode,
} from "react"
import { Popover as PopoverPrimitive } from "@base-ui/react/popover"
import { useRender } from "@base-ui/react/use-render"
import { cn } from "cn"

import { Popover, PopoverContent } from "@etic-ui/components/ui/popover"
import { CLASSES_BULLE, CLASSES_FLECHE } from "@etic-ui/components/ui/tooltip"

export interface ToggletipProps {
  /** L'explication : bulle au toucher, au clic, au survol et au focus, et
   *  texte lu par les lecteurs d'écran. */
  explication: string
  /** Ce qui porte l'explication : un badge, une date, un mot. */
  children: ReactNode
  /** Élément qui porte la bulle : `<span />` par défaut (`<time dateTime=…
   *  />` pour une date, par exemple). Ses props (gestionnaires, `ref`,
   *  classes) sont fusionnées avec celles de la bulle ; il reçoit
   *  `tabIndex={0}`, sauf s'il en a déjà un. */
  render?: ReactElement<{ tabIndex?: number }>
  /** Texte lu après le contenu ; « : explication » par défaut. */
  texteLu?: string
  /** Classes de l'élément focalisable (sa forme, pour l'anneau de focus). */
  className?: string
  /** `data-slot` de l'élément focalisable ; « toggletip » par défaut. */
  "data-slot"?: string
}

/** Ce qui tient la bulle ouverte. Le focus l'emporte sur le survol : la
 *  souris qui s'en va ne ferme pas une bulle qui a le focus ; un clic la
 *  garde jusqu'au suivant. */
type Ouverture = "survol" | "focus" | "clic" | null

/**
 * Explication d'un élément qui n'est pas une action (badge, date, sigle),
 * dans une bulle `Popover` à l'allure d'une infobulle : elle s'ouvre au
 * toucher et au clic (une infobulle de Base UI ne s'ouvre pas au toucher),
 * au survol de la souris et au focus ; elle se ferme au toucher ou au clic
 * ailleurs (ou sur l'élément), à Échap, et quand le focus s'en va. Le clic
 * ne remonte pas : dans une carte ou une ligne cliquable, il n'active pas
 * aussi son parent. Les lecteurs d'écran lisent l'explication à la suite du
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
  // L'élément porteur (en état : un ref lu au rendu ne suivrait pas son
  // montage).
  const [porteur, setPorteur] = useState<HTMLElement | null>(null)
  // Ancre de la bulle : le porteur, ou le badge qui l'entoure (texte d'un
  // `RemovableBadge`) — la flèche part du contour du badge, pas du texte.
  const ancre = porteur?.closest<HTMLElement>('[data-slot="badge"]') ?? porteur

  // Les props de `render` sont fusionnées par `useRender` : ses gestionnaires
  // sont appelés avec les nôtres, ses classes ajoutées, sa `ref` gardée.
  const element = useRender<Record<string, never>, HTMLElement>({
    defaultTagName: "span",
    render,
    ref: setPorteur,
    props: {
      "data-slot": slot,
      // Atteignable au clavier même quand l'application fournit son élément
      // (`<time>` n'est pas focalisable de lui-même).
      tabIndex: render.props.tabIndex ?? 0,
      className: cn(
        "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
        className
      ),
      onClick: (event) => {
        event.stopPropagation()
        // Ouverte au survol ou au focus, le clic la garde ; ouverte au clic,
        // il la ferme.
        setOuverture((actuelle) => (actuelle === "clic" ? null : "clic"))
      },
      onPointerEnter: (event) => {
        if (event.pointerType === "mouse")
          setOuverture((actuelle) => actuelle ?? "survol")
      },
      onPointerLeave: (event) => {
        if (event.pointerType === "mouse")
          setOuverture((actuelle) => (actuelle === "survol" ? null : actuelle))
      },
      onFocus: () =>
        setOuverture((actuelle) => (actuelle === "clic" ? actuelle : "focus")),
      onBlur: () => setOuverture(null),
      // Échap ferme la bulle seule, pas le dialogue qui l'entoure.
      onKeyDown: (event) => {
        if (event.key === "Escape" && ouverture) {
          event.stopPropagation()
          setOuverture(null)
        }
      },
      children: (
        <>
          {children}
          <span className="sr-only">{texteLu}</span>
        </>
      ),
    } satisfies HTMLAttributes<HTMLElement> & { "data-slot": string },
  })

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
        <PopoverContent
          anchor={ancre}
          side="top"
          data-slot="toggletip-content"
          // Le focus reste sur l'élément : la bulle ne contient rien à
          // atteindre, et répète ce que lisent les lecteurs d'écran.
          initialFocus={false}
          finalFocus={false}
          aria-hidden
          // L'allure de `TooltipContent`, à la place de celle du popover.
          className={cn(CLASSES_BULLE, "shadow-none ring-0")}
        >
          {explication}
          <PopoverPrimitive.Arrow className={CLASSES_FLECHE} />
        </PopoverContent>
      </Popover>
    </>
  )
}
