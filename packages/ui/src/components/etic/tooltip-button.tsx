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
  /** Texte de l'infobulle. Un bouton à icône seule (`size` `icon…`) sans
   *  `aria-label` ni `aria-labelledby` reçoit aussi l'infobulle comme
   *  `aria-label` : l'infobulle seule ne le nomme pas. */
  infobulle?: string
  /**
   * Action impossible : le bouton est désactivé mais reste focalisable et
   * survolable, et son infobulle dit pourquoi (au lieu de promettre une
   * action qu'il refusera). La raison est aussi sa description accessible.
   */
  verrou?: string
  /**
   * Action destructrice discrète : gris au repos, rouge au survol seulement
   * (une colonne de corbeilles rouges ferait une colonne d'alarmes). Pour un
   * bouton `ghost` ; verrouillé, il reste gris.
   */
  destructif?: boolean
}

/** Rouge au survol (`destructif`) : les classes de la corbeille de
 *  `DeleteButton`. Usage interne (non exporté par `index.ts`). */
export const CLASSES_DESTRUCTIF_AU_SURVOL =
  "hover:bg-destructive/10 hover:text-destructive dark:hover:bg-destructive/20"

/**
 * Le `Button` de shadcn avec une infobulle, et un état verrouillé qui
 * s'explique. Les props reçues d'un déclencheur (`DialogTrigger`,
 * `DropdownMenuTrigger` avec `render`) arrivent jusqu'au bouton.
 */
export function TooltipButton({
  infobulle,
  verrou,
  destructif = false,
  disabled,
  className,
  children,
  "aria-describedby": decritPar,
  ...props
}: TooltipButtonProps) {
  const { describedBy, raison } = useRaisonVerrou(verrou, decritPar)
  const classes = cn(
    destructif && "text-muted-foreground",
    destructif && !verrou && CLASSES_DESTRUCTIF_AU_SURVOL,
    className
  )
  if (!infobulle && !verrou) {
    return (
      <Button
        disabled={disabled}
        className={classes}
        aria-describedby={decritPar}
        {...props}
      >
        {children}
      </Button>
    )
  }
  // Nom d'un bouton à icône seule : l'infobulle, jamais la raison du verrou
  // (elle est sa description). Un bouton à texte garde son texte pour nom
  // (WCAG 2.5.3).
  const estIconeSansNom =
    !!infobulle &&
    String(props.size ?? "").startsWith("icon") &&
    props["aria-label"] === undefined &&
    props["aria-labelledby"] === undefined
  return (
    <>
      <Tooltip>
        <TooltipTrigger
          render={
            <Button
              aria-label={estIconeSansNom ? infobulle : undefined}
              {...props}
              disabled={disabled || !!verrou}
              // Un bouton désactivé nativement ne reçoit ni survol ni focus :
              // l'infobulle de la raison ne s'afficherait jamais. L'allure
              // estompée vient du `Button` (`aria-disabled:`).
              focusableWhenDisabled={
                verrou ? true : props.focusableWhenDisabled
              }
              aria-describedby={describedBy}
              className={classes}
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
