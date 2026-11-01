import type { ComponentProps } from "react"
import { cn } from "cn"

import { Badge } from "@etic-ui/components/ui/badge"
import { TONS, type StatusTon } from "@etic-ui/lib/ton"

// Le type vit dans lib/ton ; réexporté ici, où il était défini jusqu'en 0.2.
export type { StatusTon }

export interface StatusBadgeProps extends Omit<
  ComponentProps<typeof Badge>,
  "variant"
> {
  /** « neutral » par défaut. */
  ton?: StatusTon
}

/**
 * Badge d'état (actif, en retard, désactivé…) : le `Badge` de shadcn, teinté
 * selon le ton et précédé d'une pastille, pour que l'état ne repose pas sur
 * la seule couleur du texte. Le libellé dit l'état en toutes lettres.
 */
export function StatusBadge({
  ton = "neutral",
  className,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <Badge
      variant={TONS[ton].badge}
      data-ton={ton}
      className={className}
      {...props}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", TONS[ton].pastille)}
      />
      {children}
    </Badge>
  )
}
