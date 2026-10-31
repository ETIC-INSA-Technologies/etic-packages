import type { ComponentProps } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

import { Toggle } from "@etic-ui/components/ui/toggle"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import { useRaisonVerrou } from "@etic-ui/components/etic/tooltip-button"

export interface IconToggleProps extends Omit<
  ComponentProps<typeof Toggle>,
  "children" | "pressed" | "defaultPressed" | "onPressedChange" | "disabled"
> {
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
  /** Bascule en cours d'enregistrement : le bouton est occupé
   *  (`aria-busy`) et ne réagit plus, mais garde le focus. */
  enCours?: boolean
  /** Bascule impossible : le bouton reste focalisable, et son infobulle dit
   *  pourquoi. */
  verrou?: string
}

/**
 * Bouton à icône qui pose ou retire un marqueur sensible (élément critique,
 * protégé…), sur le `Toggle` de shadcn : sans libellé visible, il porte son
 * état (`aria-pressed`, fond marqué quand il est actif), et son infobulle
 * dit ce que ferait un clic.
 */
export function IconToggle({
  actif,
  onActifChange,
  icone: Icone,
  libelle,
  infobulles,
  enCours = false,
  verrou,
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
  // Ni le verrou ni l'enregistrement ne désactivent nativement le bouton :
  // il perdrait le focus (et le survol qui montre la raison). Il est dit
  // indisponible et ignore les clics.
  const inerte = !!verrou || enCours
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Toggle
              {...props}
              size={size}
              pressed={actif}
              onPressedChange={(suivant) => {
                if (!inerte) onActifChange(suivant)
              }}
              aria-disabled={inerte || undefined}
              aria-busy={enCours || undefined}
              aria-label={libelle}
              aria-describedby={describedBy}
              className={cn(
                "aria-pressed:text-foreground",
                verrou && "cursor-not-allowed opacity-50",
                enCours && "cursor-progress opacity-50",
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
