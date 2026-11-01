import type { ReactElement, ReactNode } from "react"
import { cn } from "cn"

import { Toggletip } from "@etic-ui/components/etic/toggletip"

export interface ExplainedBadgeProps {
  /** L'explication : bulle au toucher, au clic, au survol et au focus, et
   *  texte lu par les lecteurs d'écran. */
  explication: string
  /** Le badge (ou tout contenu court) qui porte l'explication. */
  children: ReactNode
  /** Élément qui porte la bulle : `<span />` par défaut
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
 * droit critique) : l'explication s'ouvre au toucher et au clic, au survol
 * **et au focus** (l'élément est atteignable au clavier, avec son anneau, ce
 * que n'offre pas un `title` natif), et les lecteurs d'écran la lisent à la
 * suite du badge. Un `Toggletip` à la forme du badge.
 */
export function ExplainedBadge({
  explication,
  children,
  render,
  texteLu,
  className,
}: ExplainedBadgeProps) {
  return (
    <Toggletip
      explication={explication}
      render={render}
      texteLu={texteLu}
      data-slot="explained-badge"
      className={cn("inline-flex rounded-4xl", className)}
    >
      {children}
    </Toggletip>
  )
}
