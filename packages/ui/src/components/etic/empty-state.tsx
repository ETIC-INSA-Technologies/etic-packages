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
import { Button } from "@etic-ui/components/ui/button"

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

export interface FilteredEmptyStateProps extends Omit<
  EmptyStateProps,
  "action" | "titre"
> {
  /** « Aucun document pour ces filtres ». « Aucun résultat pour ces
   *  filtres » par défaut. */
  titre?: ReactNode
  /** Retire les filtres (et la recherche). */
  onReinitialiser: () => void
  /** « Réinitialiser les filtres » par défaut. */
  libelleReinitialiser?: string
}

/**
 * Le vide d'une liste filtrée, distinct d'un vide réel (`EmptyState`) : rien
 * ne correspond aux filtres, et il propose de les retirer. À passer en `vide`
 * de `DataTable` quand des filtres sont posés.
 */
export function FilteredEmptyState({
  titre = "Aucun résultat pour ces filtres",
  onReinitialiser,
  libelleReinitialiser = "Réinitialiser les filtres",
  ...props
}: FilteredEmptyStateProps) {
  return (
    <EmptyState
      titre={titre}
      action={
        <Button variant="outline" onClick={onReinitialiser}>
          {libelleReinitialiser}
        </Button>
      }
      {...props}
    />
  )
}
