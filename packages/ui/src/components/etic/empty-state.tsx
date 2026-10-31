import type { ReactNode } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@etic-ui/components/ui/empty"

export interface EmptyStateProps {
  titre: ReactNode
  /** Pourquoi c'est vide, ce qui le remplira. */
  description?: ReactNode
  /** L'action qui comble le vide (créer le premier élément…), si la
   *  personne a le droit de la faire. */
  action?: ReactNode
  /** Icône lucide (le composant : `icone={InboxIcon}`), dans sa pastille. */
  icone?: LucideIcon
  className?: string
}

/**
 * Ce qu'affiche une liste, une carte ou une page qui n'a rien à montrer,
 * sur l'`Empty` de shadcn : un titre, pourquoi, et l'issue, dans un cadre
 * pointillé (`className="border-0"` le retire, dans une carte par exemple).
 * C'est aussi le rendu du `vide` de `QueryBoundary`.
 */
export function EmptyState({
  titre,
  description,
  action,
  icone: Icone,
  className,
}: EmptyStateProps) {
  return (
    <Empty className={cn("border", className)}>
      <EmptyHeader>
        {Icone ? (
          <EmptyMedia variant="icon">
            <Icone />
          </EmptyMedia>
        ) : null}
        <EmptyTitle>{titre}</EmptyTitle>
        {description ? (
          <EmptyDescription>{description}</EmptyDescription>
        ) : null}
      </EmptyHeader>
      {action ? <EmptyContent>{action}</EmptyContent> : null}
    </Empty>
  )
}
