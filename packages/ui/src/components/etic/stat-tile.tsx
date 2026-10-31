import type { ReactNode } from "react"
import { cn } from "cn"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@etic-ui/components/ui/card"
import {
  PASTILLES,
  type StatusTon,
} from "@etic-ui/components/etic/status-badge"

const TEXTES: Record<StatusTon, string> = {
  neutral: "",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
}

export interface StatTileProps {
  libelle: string
  /** Toujours du texte : un chiffre, ou un mot (« À jour »). */
  valeur: ReactNode
  /** Contexte sous la valeur : « il y a 9 jours », « sur 120 ». */
  indication?: ReactNode
  /** Quand l'état compte, une pastille et la valeur en couleur ; « neutral »
   *  (par défaut) pour un simple chiffre. */
  ton?: StatusTon
  className?: string
}

/**
 * Un chiffre clé d'une rangée de résumé, sur le modèle des cartes de
 * statistiques de shadcn : libellé, valeur, contexte.
 */
export function StatTile({
  libelle,
  valeur,
  indication,
  ton = "neutral",
  className,
}: StatTileProps) {
  return (
    <Card size="sm" data-slot="stat-tile" className={className}>
      <CardHeader>
        <CardDescription>{libelle}</CardDescription>
        <CardTitle
          data-ton={ton}
          className={cn(
            "flex items-center gap-2 text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl",
            TEXTES[ton]
          )}
        >
          {ton !== "neutral" ? (
            <span
              aria-hidden
              className={cn("size-2 shrink-0 rounded-full", PASTILLES[ton])}
            />
          ) : null}
          <span className="min-w-0 break-words">{valeur}</span>
        </CardTitle>
        {indication ? (
          <div className="text-xs text-muted-foreground">{indication}</div>
        ) : null}
      </CardHeader>
    </Card>
  )
}
