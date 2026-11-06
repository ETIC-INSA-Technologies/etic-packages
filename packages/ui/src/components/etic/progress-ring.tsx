import type { ComponentProps, ReactNode } from "react"
import { cn } from "cn"

import { TONS, type StatusTon } from "@etic-ui/lib/ton"

// Dans un carré de 100 : l'anneau longe le bord du cadre, épais de 11 % de
// son diamètre.
const EPAISSEUR = 11
const RAYON = (100 - EPAISSEUR) / 2
// Ce que dépasse un bout arrondi, en % du tour : une demi-épaisseur. Le
// tracé est raccourci de deux bouts et part un bout plus loin, pour que
// l'arc, bouts compris, couvre exactement la valeur (sans quoi les bouts se
// chevauchent à midi près du plein).
const BOUT = (EPAISSEUR / 2 / (2 * Math.PI * RAYON)) * 100
// Piste et arc : le même cercle.
const CERCLE = {
  cx: 50,
  cy: 50,
  r: RAYON,
  fill: "none",
  strokeWidth: EPAISSEUR,
} as const

export interface ProgressRingProps extends Omit<
  ComponentProps<"div">,
  "children" | "role" | "aria-label"
> {
  /** Part remplie, de 0 à 100 (bornée) ; `null` : inconnue, anneau vide. */
  valeur: number | null
  /** Couleur de l'arc : « warning » au-delà d'un seuil d'alerte,
   *  « destructive » quand c'est plein. « neutral » (par défaut) : l'accent. */
  ton?: StatusTon
  /** Ce que lit un lecteur d'écran, valeur comprise : « Mémoire : 45 % ». */
  libelle: string
  /** Au centre de l'anneau, le pourcentage en général ; caché aux lecteurs
   *  d'écran, que `libelle` renseigne déjà. */
  children?: ReactNode
}

/**
 * Jauge circulaire d'une ressource qui se remplit (mémoire, disque, quota) :
 * un anneau sur piste grise, rempli dans le sens des aiguilles d'une montre
 * depuis midi, et une valeur au centre. Le pendant rond de `Progress`, pour
 * une jauge qui se lit seule ; SVG pur, sans bibliothèque de graphiques.
 * La taille vient de `className` (`size-28` par défaut) ; le texte du centre
 * se règle avec ses propres classes (`text-2xl`, couleur du ton…).
 */
export function ProgressRing({
  valeur,
  ton = "neutral",
  libelle,
  children,
  className,
  ...props
}: ProgressRingProps) {
  const part =
    valeur === null || Number.isNaN(valeur)
      ? 0
      : Math.min(100, Math.max(0, valeur))
  // Plein : un cercle fermé, sans bouts. Sous deux bouts (~4 %), l'arc se
  // réduit à un point de l'épaisseur de l'anneau.
  const plein = part >= 100
  return (
    <div
      role="img"
      aria-label={libelle}
      data-slot="progress-ring"
      data-ton={ton}
      className={cn("relative size-28 shrink-0", className)}
      {...props}
    >
      <svg aria-hidden viewBox="0 0 100 100" className="size-full -rotate-90">
        <circle {...CERCLE} className="stroke-muted" />
        {/* Rien à 0 : le bout arrondi d'un arc vide dessinerait un point. */}
        {part > 0 ? (
          <circle
            {...CERCLE}
            data-slot="progress-ring-arc"
            strokeLinecap={plein ? "butt" : "round"}
            pathLength={100}
            strokeDasharray={`${plein ? 100 : Math.max(part - 2 * BOUT, 0.01)} 100`}
            strokeDashoffset={plein ? 0 : -BOUT}
            className={TONS[ton].trait}
          />
        ) : null}
      </svg>
      {children != null ? (
        <span
          aria-hidden
          className="absolute inset-0 grid place-items-center text-xl font-semibold tracking-tight tabular-nums"
        >
          {children}
        </span>
      ) : null}
    </div>
  )
}
