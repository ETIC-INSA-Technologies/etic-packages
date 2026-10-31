import type { ReactNode } from "react"

import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@etic-ui/components/ui/card"

export interface SectionCardProps {
  /** Titre de la section, un `<h2>`. */
  titre: ReactNode
  description?: ReactNode
  /** Boutons à droite du titre. */
  actions?: ReactNode
  children: ReactNode
  className?: string
}

/** Section titrée d'une page, sur la `Card` de shadcn. */
export function SectionCard({
  titre,
  description,
  actions,
  children,
  className,
}: SectionCardProps) {
  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle role="heading" aria-level={2}>
          {titre}
        </CardTitle>
        {description ? <CardDescription>{description}</CardDescription> : null}
        {actions ? (
          <CardAction className="flex flex-wrap items-center gap-2">
            {actions}
          </CardAction>
        ) : null}
      </CardHeader>
      <CardContent>{children}</CardContent>
    </Card>
  )
}
