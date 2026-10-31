import { useId, type ComponentProps, type ReactNode } from "react"
import { cn } from "cn"

import { Button } from "@etic-ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"

/**
 * Raison d'un verrou, en description accessible : un `<span hidden>` à
 * poser hors du bouton (pour ne pas s'ajouter à son nom), et l'`aria-
 * describedby` qui le cite, à la suite d'une description déjà donnée.
 * Usage interne (`TooltipButton`, `IconToggle`).
 */
export function useRaisonVerrou(
  verrou: string | undefined,
  decritPar?: string
): { describedBy: string | undefined; raison: ReactNode } {
  const id = useId()
  return {
    describedBy:
      [decritPar, verrou && id].filter(Boolean).join(" ") || undefined,
    raison: verrou ? (
      <span id={id} hidden>
        {verrou}
      </span>
    ) : null,
  }
}

export interface TooltipButtonProps extends ComponentProps<typeof Button> {
  /** Texte de l'infobulle. Un bouton à icône seule reçoit aussi un
   *  `aria-label` : l'infobulle n'est pas son nom accessible. */
  infobulle?: string
  /**
   * Action impossible : le bouton est désactivé mais reste focalisable et
   * survolable, et son infobulle dit pourquoi (au lieu de promettre une
   * action qu'il refusera). La raison est aussi sa description accessible.
   */
  verrou?: string
}

/**
 * Le `Button` de shadcn avec une infobulle, et un état verrouillé qui
 * s'explique. Les props reçues d'un déclencheur (`DialogTrigger`,
 * `DropdownMenuTrigger` avec `render`) arrivent jusqu'au bouton.
 */
export function TooltipButton({
  infobulle,
  verrou,
  disabled,
  className,
  children,
  "aria-describedby": decritPar,
  ...props
}: TooltipButtonProps) {
  const { describedBy, raison } = useRaisonVerrou(verrou, decritPar)
  if (!infobulle && !verrou) {
    return (
      <Button
        disabled={disabled}
        className={className}
        aria-describedby={decritPar}
        {...props}
      >
        {children}
      </Button>
    )
  }
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              {...props}
              disabled={disabled || !!verrou}
              // Un bouton désactivé nativement ne reçoit ni survol ni focus :
              // l'infobulle de la raison ne s'afficherait jamais.
              focusableWhenDisabled={
                verrou ? true : props.focusableWhenDisabled
              }
              aria-describedby={describedBy}
              className={cn(
                verrou &&
                  "cursor-not-allowed opacity-50 active:not-aria-[haspopup]:translate-y-0",
                className
              )}
            />
          }
        >
          {children}
        </TooltipTrigger>
        <TooltipContent>{verrou ?? infobulle}</TooltipContent>
      </Tooltip>
      {raison}
    </>
  )
}
