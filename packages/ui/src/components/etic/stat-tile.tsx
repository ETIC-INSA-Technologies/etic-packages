import type { ReactNode } from "react"
import { cn } from "cn"
import { ChevronRightIcon } from "lucide-react"

import {
  Card,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@etic-ui/components/ui/card"
import { useLien, type LienComposant } from "@etic-ui/components/etic/lien"
import { TONS, type StatusTon } from "@etic-ui/lib/ton"

export interface StatTileProps {
  libelle: string
  /** Toujours du texte : un chiffre, ou un mot (« À jour »). */
  valeur: ReactNode
  /** Contexte sous la valeur : « il y a 9 jours », « sur 120 ». */
  indication?: ReactNode
  /** Quand l'état compte, une pastille et la valeur en couleur ; « neutral »
   *  (par défaut) pour un simple chiffre. */
  ton?: StatusTon
  /** Page du détail : toute la tuile devient un lien, avec un chevron. */
  href?: string
  /** Composant de lien du routeur ; par défaut, celui du `LienProvider`,
   *  sinon un `<a>`. */
  lien?: LienComposant
  className?: string
}

/**
 * Un chiffre clé d'une rangée de résumé, sur le modèle des cartes de
 * statistiques de shadcn : libellé, valeur, contexte. Avec `href`, la tuile
 * mène à la page de son détail.
 */
export function StatTile({
  libelle,
  valeur,
  indication,
  ton = "neutral",
  href,
  lien,
  className,
}: StatTileProps) {
  const Lien = useLien(lien)
  const carte = (
    <Card
      size="sm"
      data-slot="stat-tile"
      className={cn(
        // Survol opaque, comme celui du bouton secondary : la carte vire de
        // 5 % vers le texte, visible dans les deux thèmes (un bg-muted/50
        // remplaçait le fond de la carte et ne se voyait plus en sombre).
        href &&
          "flex-1 transition-colors group-hover/stat-tile-lien:bg-[color-mix(in_oklch,var(--card),var(--foreground)_5%)]",
        className
      )}
    >
      <CardHeader>
        <CardDescription
          className={cn(href && "flex items-center justify-between gap-2")}
        >
          {libelle}
          {href ? (
            <ChevronRightIcon
              aria-hidden
              className="size-4 shrink-0 transition-transform group-hover/stat-tile-lien:translate-x-0.5"
            />
          ) : null}
        </CardDescription>
        <CardTitle
          data-ton={ton}
          className={cn(
            "flex items-center gap-2 text-2xl font-semibold tabular-nums group-data-[size=sm]/card:text-2xl",
            TONS[ton].texte
          )}
        >
          {ton !== "neutral" ? (
            <span
              aria-hidden
              className={cn("size-2 shrink-0 rounded-full", TONS[ton].pastille)}
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
  if (!href) return carte
  return (
    // `Lien` vient des props ou du contexte : stable (voir `ButtonLink`).
    // eslint-disable-next-line react-hooks/static-components
    <Lien
      href={href}
      data-slot="stat-tile-link"
      // flex : la carte remplit la hauteur de sa ligne de StatGrid, comme une
      // tuile sans lien. L'anneau de focus suit l'arrondi de la carte.
      className="group/stat-tile-lien flex rounded-xl outline-none focus-visible:ring-3 focus-visible:ring-ring/50"
    >
      {carte}
    </Lien>
  )
}
