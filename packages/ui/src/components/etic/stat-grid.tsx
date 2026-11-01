import type { ComponentProps } from "react"
import { cn } from "cn"

/** Une longueur CSS avec son unité : « 190px », « 12rem ». */
export type LongueurCss = `${number}${"px" | "rem" | "em" | "ch" | "%"}`

export interface StatGridProps extends ComponentProps<"div"> {
  /** Largeur minimale d'une colonne : autant de colonnes que la largeur en
   *  permet. « 190px » par défaut ; jamais plus large que la rangée, sur
   *  téléphone. */
  largeurMin?: LongueurCss
}

/**
 * Rangée de tuiles de chiffres (`StatTile`) : une grille qui remplit la
 * largeur avec autant de colonnes de `largeurMin` au moins qu'elle en
 * contient, et passe à une colonne sur un écran étroit.
 */
export function StatGrid({
  largeurMin = "190px",
  className,
  style,
  ...props
}: StatGridProps) {
  return (
    <div
      data-slot="stat-grid"
      className={cn("grid gap-3", className)}
      style={{
        gridTemplateColumns: `repeat(auto-fit, minmax(min(${largeurMin}, 100%), 1fr))`,
        ...style,
      }}
      {...props}
    />
  )
}
