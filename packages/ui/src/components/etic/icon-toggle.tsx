import { Toggle as TogglePrimitive } from "@base-ui/react/toggle"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import { useRaisonVerrou } from "@etic-ui/components/etic/tooltip-button"
import { TONS, type StatusTon } from "@etic-ui/lib/ton"

export interface IconToggleProps extends Omit<
  TogglePrimitive.Props,
  | "children"
  | "pressed"
  | "defaultPressed"
  | "onPressedChange"
  | "disabled"
  | "render"
  | "nativeButton"
> {
  /** `default` (fond transparent) par défaut, ou `outline` (cadre). */
  variant?: "default" | "outline"
  /** Taille du bouton carré : `sm` (28 px) par défaut, `default` (32 px)
   *  ou `lg` (36 px). Noms de la 0.2.0, gardés. */
  size?: keyof typeof TAILLES
  /** État actuel : le marqueur est-il posé ? */
  actif: boolean
  /** Appelé avec l'état voulu. */
  onActifChange: (actif: boolean) => void
  icone: LucideIcon
  /** Nom accessible, constant (l'état est porté par `aria-pressed`) :
   *  « Groupe critique ». */
  libelle: string
  /** Infobulle selon l'état : ce que ferait un clic (« Marquer ce groupe
   *  comme critique », « Retirer le marqueur critique »). Le libellé par
   *  défaut. */
  infobulles?: { activer: string; desactiver: string }
  /** Bascule en cours d'enregistrement : comme un `Button` en cours, une
   *  roue remplace l'icône, le bouton est occupé (`aria-busy`) et ne réagit
   *  plus, mais garde le focus. */
  enCours?: boolean
  /** Bascule impossible : le bouton reste focalisable, et son infobulle dit
   *  pourquoi. */
  verrou?: string
  /** Couleur du bouton actif : `warning` (jaune) par défaut, le marqueur
   *  signale un élément sensible ; `neutral` pour le fond gris du Toggle. */
  ton?: StatusTon
}

/** Taille du `Button` à icône seule qui porte la bascule. */
const TAILLES = {
  default: "icon",
  sm: "icon-sm",
  lg: "icon-lg",
} as const

/**
 * Bouton à icône qui pose ou retire un marqueur sensible (élément critique,
 * protégé…), sur le `Toggle` de Base UI rendu en `Button` à icône (comme la
 * corbeille de `DeleteButton` à côté) : sans libellé visible, il porte son
 * état (`aria-pressed`, en couleur de son `ton` quand il est actif), et son
 * infobulle dit ce que ferait un clic. Son état « en cours » est celui du
 * `Button`.
 */
export function IconToggle({
  actif,
  onActifChange,
  icone: Icone,
  libelle,
  infobulles,
  enCours = false,
  verrou,
  ton = "warning",
  variant = "default",
  size = "sm",
  className,
  ...props
}: IconToggleProps) {
  const { describedBy, raison } = useRaisonVerrou(verrou)
  const action = infobulles
    ? actif
      ? infobulles.desactiver
      : infobulles.activer
    : libelle
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <TogglePrimitive
              {...props}
              data-slot="toggle"
              pressed={actif}
              onPressedChange={(suivant) => {
                if (!verrou && !enCours) onActifChange(suivant)
              }}
              // Ni le verrou ni l'enregistrement ne désactivent nativement le
              // bouton : il perdrait le focus (et le survol qui montre la
              // raison). Il est dit indisponible et ignore les clics.
              render={
                <Button
                  variant={variant === "outline" ? "outline" : "ghost"}
                  size={TAILLES[size]}
                  disabled={!!verrou}
                  focusableWhenDisabled
                  enCours={enCours}
                />
              }
              aria-label={libelle}
              aria-describedby={describedBy}
              className={cn(
                // Inactif, en gris comme les icônes d'action voisines : seul
                // l'état actif attire l'œil.
                "text-muted-foreground aria-pressed:bg-muted",
                // Couleur du bouton actif, survol compris (le bouton passe
                // sinon en texte normal).
                TONS[ton].basculeActive,
                className
              )}
            />
          }
        >
          <Icone />
        </TooltipTrigger>
        <TooltipContent>{verrou ?? action}</TooltipContent>
      </Tooltip>
      {raison}
    </>
  )
}
