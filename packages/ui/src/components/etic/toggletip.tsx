import {
  cloneElement,
  useEffect,
  useState,
  type ReactElement,
  type ReactNode,
} from "react"
import { cn } from "cn"

import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@etic-ui/components/ui/popover"
import {
  focusHorsNavigation,
  suivreNavigationClavier,
} from "@etic-ui/lib/navigation-clavier"

export interface ToggletipProps {
  /** L'explication : bulle au toucher, au clic, au survol et au focus
   *  clavier, et texte lu par les lecteurs d'écran. */
  explication: string
  /** Ce qui porte l'explication : un badge, une date, un mot. */
  children: ReactNode
  /** Élément qui porte la bulle : `<span />` par défaut (`<time dateTime=…
   *  />` pour une date, par exemple). Il reçoit `tabIndex={0}`, sauf s'il en
   *  a déjà un. */
  render?: ReactElement<{ tabIndex?: number }>
  /** Texte lu après le contenu ; « : explication » par défaut. */
  texteLu?: string
  /** Côté où s'ouvre la bulle ; au-dessus par défaut, comme une infobulle. */
  side?: "top" | "bottom" | "left" | "right"
  /** Classes de l'élément focalisable (sa forme, pour l'anneau de focus). */
  className?: string
  /** `data-slot` de l'élément focalisable ; « toggletip » par défaut. */
  "data-slot"?: string
}

/**
 * Explication d'un élément qui n'est pas une action (badge, date, sigle), sur
 * le `Popover` de shadcn : elle s'ouvre au toucher et au clic (une infobulle
 * de Base UI ne s'ouvre pas au toucher), au survol de la souris et au focus
 * d'une navigation au clavier ; elle se ferme au toucher ou au clic ailleurs,
 * à Échap, et quand le focus s'en va. Les lecteurs d'écran lisent
 * l'explication à la suite du contenu (`texteLu`) : la bulle, qui la répète,
 * leur est masquée.
 *
 * Pour un bouton qui a une action, une infobulle (`TooltipButton`) reste de
 * mise : le toucher y déclenche l'action.
 */
export function Toggletip({
  explication,
  children,
  render = <span />,
  texteLu = ` : ${explication}`,
  side = "top",
  className,
  "data-slot": slot = "toggletip",
}: ToggletipProps) {
  const [ouvert, setOuvert] = useState(false)
  useEffect(suivreNavigationClavier, [])
  // Atteignable au clavier même quand l'application fournit son élément
  // (`<time>` n'est pas focalisable de lui-même). Pas de rôle de bouton : le
  // contenu et son explication sont lus comme un texte.
  const porteur = cloneElement(render, {
    tabIndex: render.props.tabIndex ?? 0,
    role: undefined,
    "aria-haspopup": undefined,
    "aria-expanded": undefined,
    "aria-controls": undefined,
  } as Record<string, unknown>)
  return (
    <Popover open={ouvert} onOpenChange={setOuvert}>
      <PopoverTrigger
        nativeButton={false}
        render={porteur}
        openOnHover
        delay={0}
        data-slot={slot}
        className={cn(
          "outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
        onFocus={() => {
          if (!focusHorsNavigation()) setOuvert(true)
        }}
        onBlur={() => setOuvert(false)}
      >
        {children}
        <span className="sr-only">{texteLu}</span>
      </PopoverTrigger>
      <PopoverContent
        side={side}
        // Le focus reste sur l'élément : la bulle ne contient rien à
        // atteindre.
        initialFocus={false}
        aria-hidden
        data-slot="toggletip-content"
        // L'allure d'une infobulle (`TooltipContent`).
        className="w-fit max-w-xs gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background shadow-none ring-0"
      >
        {explication}
      </PopoverContent>
    </Popover>
  )
}
