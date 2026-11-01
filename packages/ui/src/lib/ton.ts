/**
 * Les tons d'état de la suite et leurs classes, à un seul endroit : un ton
 * s'ajoute ici, et tous les composants qui en ont un (`StatusBadge`,
 * `StatTile`, `Progress`, `IconToggle`, `SegmentedControl`) le reçoivent.
 *
 * Les classes sont écrites en entier (pas de `bg-${ton}`) : Tailwind ne
 * détecte que les classes littérales.
 */

import type { VariantProps } from "class-variance-authority"

import type { badgeVariants } from "@etic-ui/components/ui/badge"

/** Ce que dit un état : bon, à surveiller, en échec, une information (un
 *  changement sans gravité), ou rien de particulier. */
export type StatusTon =
  "neutral" | "info" | "success" | "warning" | "destructive"

export interface ClassesTon {
  /** Variante du `Badge` (`StatusBadge`). */
  badge: NonNullable<VariantProps<typeof badgeVariants>["variant"]>
  /** Texte de la couleur du ton (valeur d'une `StatTile`). */
  texte: string
  /** Pastille pleine, qui double la couleur du texte. */
  pastille: string
  /** Piste d'une jauge `Progress` (teinte à 15 %). */
  piste: string
  /** Remplissage d'une jauge `Progress`. */
  remplissage: string
  /** `IconToggle` actif, survol et thème sombre compris. */
  basculeActive: string
  /** Segment choisi d'un `SegmentedControl` : fond, texte et liseré ; fond
   *  plus soutenu en sombre (+10 %, comme `basculeActive` et `Badge`). */
  segmentChoisi: string
}

export const TONS: Record<StatusTon, ClassesTon> = {
  // « neutral » garde l'apparence par défaut de chaque composant.
  neutral: {
    badge: "secondary",
    texte: "",
    pastille: "bg-muted-foreground",
    piste: "",
    remplissage: "",
    basculeActive: "aria-pressed:text-foreground",
    segmentChoisi: "",
  },
  info: {
    badge: "info",
    texte: "text-info",
    pastille: "bg-info",
    piste: "bg-info/15",
    remplissage: "bg-info",
    basculeActive:
      "aria-pressed:bg-info/10 aria-pressed:text-info aria-pressed:hover:bg-info/15 aria-pressed:hover:text-info dark:aria-pressed:bg-info/20 dark:aria-pressed:hover:bg-info/25",
    segmentChoisi:
      "aria-pressed:bg-info/15 aria-pressed:text-info aria-pressed:inset-ring-info/60 dark:aria-pressed:bg-info/25",
  },
  success: {
    badge: "success",
    texte: "text-success",
    pastille: "bg-success",
    piste: "bg-success/15",
    remplissage: "bg-success",
    basculeActive:
      "aria-pressed:bg-success/10 aria-pressed:text-success aria-pressed:hover:bg-success/15 aria-pressed:hover:text-success dark:aria-pressed:bg-success/20 dark:aria-pressed:hover:bg-success/25",
    segmentChoisi:
      "aria-pressed:bg-success/15 aria-pressed:text-success aria-pressed:inset-ring-success/60 dark:aria-pressed:bg-success/25",
  },
  warning: {
    badge: "warning",
    texte: "text-warning",
    pastille: "bg-warning",
    piste: "bg-warning/15",
    remplissage: "bg-warning",
    basculeActive:
      "aria-pressed:bg-warning/10 aria-pressed:text-warning aria-pressed:hover:bg-warning/15 aria-pressed:hover:text-warning dark:aria-pressed:bg-warning/20 dark:aria-pressed:hover:bg-warning/25",
    segmentChoisi:
      "aria-pressed:bg-warning/15 aria-pressed:text-warning aria-pressed:inset-ring-warning/60 dark:aria-pressed:bg-warning/25",
  },
  destructive: {
    badge: "destructive",
    texte: "text-destructive",
    pastille: "bg-destructive",
    piste: "bg-destructive/15",
    remplissage: "bg-destructive",
    basculeActive:
      "aria-pressed:bg-destructive/10 aria-pressed:text-destructive aria-pressed:hover:bg-destructive/15 aria-pressed:hover:text-destructive dark:aria-pressed:bg-destructive/20 dark:aria-pressed:hover:bg-destructive/25",
    segmentChoisi:
      "aria-pressed:bg-destructive/15 aria-pressed:text-destructive aria-pressed:inset-ring-destructive/60 dark:aria-pressed:bg-destructive/25",
  },
}
