import type { ComponentProps } from "react"
import { cn } from "cn"

import { Badge } from "@etic-ui/components/ui/badge"

/** Ce que dit un état : bon, à surveiller, en échec, ou rien de particulier. */
export type StatusTon = "neutral" | "success" | "warning" | "destructive"

const VARIANTES = {
  neutral: "secondary",
  success: "success",
  warning: "warning",
  destructive: "destructive",
} as const satisfies Record<StatusTon, ComponentProps<typeof Badge>["variant"]>

/** Couleur de la pastille, par ton. */
export const PASTILLES: Record<StatusTon, string> = {
  neutral: "bg-muted-foreground",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
}

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
      variant={VARIANTES[ton]}
      data-ton={ton}
      className={className}
      {...props}
    >
      <span
        aria-hidden
        className={cn("size-1.5 shrink-0 rounded-full", PASTILLES[ton])}
      />
      {children}
    </Badge>
  )
}
