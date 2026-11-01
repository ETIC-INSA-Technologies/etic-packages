import { cloneElement, type ReactElement, type ReactNode } from "react"
import { cn } from "cn"

import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"

export interface ExplainedBadgeProps {
  /** L'explication : infobulle au survol et au focus, et texte lu par les
   *  lecteurs d'écran. */
  explication: string
  /** Le badge (ou tout contenu court) qui porte l'explication. */
  children: ReactNode
  /** Élément qui porte l'infobulle : `<span />` par défaut
   *  (`<time dateTime=… />` pour une date, par exemple). Il reçoit
   *  `tabIndex={0}`, sauf s'il en a déjà un. */
  render?: ReactElement<{ tabIndex?: number }>
  /** Texte lu après le contenu ; « : explication » par défaut. */
  texteLu?: string
  /** Classes de l'élément focalisable (sa forme, pour l'anneau de focus). */
  className?: string
}

/**
 * Un badge dont le sens demande une phrase (groupe imposé par un poste,
 * droit critique) : l'explication s'ouvre au survol **et au focus**
 * (l'élément est atteignable au clavier, avec son anneau, ce que n'offre
 * pas un `title` natif), et les lecteurs d'écran la lisent à la suite du
 * badge, l'infobulle ne nommant rien. Au toucher, l'infobulle de Base UI ne
 * s'ouvre pas : sur téléphone, que le badge se comprenne sans elle.
 */
export function ExplainedBadge({
  explication,
  children,
  render = <span />,
  texteLu = ` : ${explication}`,
  className,
}: ExplainedBadgeProps) {
  // Atteignable au clavier même quand l'application fournit son élément
  // (`<time>` n'est pas focalisable de lui-même).
  const porteur =
    render.props.tabIndex === undefined
      ? cloneElement(render, { tabIndex: 0 })
      : render
  return (
    <Tooltip>
      <TooltipTrigger
        render={porteur}
        data-slot="explained-badge"
        className={cn(
          "inline-flex rounded-4xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          className
        )}
      >
        {children}
        <span className="sr-only">{texteLu}</span>
      </TooltipTrigger>
      <TooltipContent>{explication}</TooltipContent>
    </Tooltip>
  )
}
