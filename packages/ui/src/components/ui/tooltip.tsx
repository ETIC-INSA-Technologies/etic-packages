"use client"

import { Tooltip as TooltipPrimitive } from "@base-ui/react/tooltip"
import { cn } from "cn"

import {
  focusRenduParUnPopup,
  noterDepartDuFocus,
} from "@etic-ui/lib/focus-rendu"

function TooltipProvider({
  delay = 0,
  ...props
}: TooltipPrimitive.Provider.Props) {
  return (
    <TooltipPrimitive.Provider
      data-slot="tooltip-provider"
      delay={delay}
      {...props}
    />
  )
}

function Tooltip({ ...props }: TooltipPrimitive.Root.Props) {
  return <TooltipPrimitive.Root data-slot="tooltip" {...props} />
}

// Écart avec shadcn : le focus qu'un popup rend à son déclencheur en se
// fermant (menu, calendrier, dialogue : Échap, un choix, « Annuler »)
// n'ouvre plus l'infobulle : elle absorbait l'Échap suivant, celui qui ferme
// le dialogue englobant (voir `lib/focus-rendu.ts`). Tout autre focus
// clavier l'ouvre comme avant ; le survol n'est pas touché.
function TooltipTrigger({
  onFocus,
  onBlur,
  ...props
}: TooltipPrimitive.Trigger.Props) {
  return (
    <TooltipPrimitive.Trigger
      data-slot="tooltip-trigger"
      onFocus={(event) => {
        onFocus?.(event)
        // Le gestionnaire de l'application d'abord ; puis, pour un focus
        // rendu, celui de Base UI (ouverture au focus) est écarté.
        if (focusRenduParUnPopup(event.currentTarget, event.relatedTarget))
          event.preventBaseUIHandler()
      }}
      onBlur={(event) => {
        onBlur?.(event)
        noterDepartDuFocus(event.currentTarget)
      }}
      {...props}
    />
  )
}

/** Allure de la bulle d'une infobulle, partagée avec `Toggletip` (ajout
 *  ETIC : les classes de shadcn, sorties en constante). */
const CLASSES_BULLE =
  "z-50 inline-flex w-fit max-w-xs origin-(--transform-origin) items-center gap-1.5 rounded-md bg-foreground px-3 py-1.5 text-xs text-background has-data-[slot=kbd]:pr-1.5 data-[side=bottom]:slide-in-from-top-2 data-[side=inline-end]:slide-in-from-left-2 data-[side=inline-start]:slide-in-from-right-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2 **:data-[slot=kbd]:relative **:data-[slot=kbd]:isolate **:data-[slot=kbd]:z-50 **:data-[slot=kbd]:rounded-sm data-[state=delayed-open]:animate-in data-[state=delayed-open]:fade-in-0 data-[state=delayed-open]:zoom-in-95 data-open:animate-in data-open:fade-in-0 data-open:zoom-in-95 data-closed:animate-out data-closed:fade-out-0 data-closed:zoom-out-95"

/** Flèche de la bulle, partagée de même. */
const CLASSES_FLECHE =
  "z-50 size-2.5 translate-y-[calc(-50%-2px)] rotate-45 rounded-[2px] bg-foreground fill-foreground data-[side=bottom]:top-1 data-[side=inline-end]:top-1/2! data-[side=inline-end]:-left-1 data-[side=inline-end]:-translate-y-1/2 data-[side=inline-start]:top-1/2! data-[side=inline-start]:-right-1 data-[side=inline-start]:-translate-y-1/2 data-[side=left]:top-1/2! data-[side=left]:-right-1 data-[side=left]:-translate-y-1/2 data-[side=right]:top-1/2! data-[side=right]:-left-1 data-[side=right]:-translate-y-1/2 data-[side=top]:-bottom-2.5"

function TooltipContent({
  className,
  side = "top",
  sideOffset = 4,
  align = "center",
  alignOffset = 0,
  children,
  ...props
}: TooltipPrimitive.Popup.Props &
  Pick<
    TooltipPrimitive.Positioner.Props,
    "align" | "alignOffset" | "side" | "sideOffset"
  >) {
  return (
    <TooltipPrimitive.Portal>
      <TooltipPrimitive.Positioner
        align={align}
        alignOffset={alignOffset}
        side={side}
        sideOffset={sideOffset}
        className="isolate z-50"
      >
        <TooltipPrimitive.Popup
          data-slot="tooltip-content"
          className={cn(CLASSES_BULLE, className)}
          {...props}
        >
          {children}
          <TooltipPrimitive.Arrow className={CLASSES_FLECHE} />
        </TooltipPrimitive.Popup>
      </TooltipPrimitive.Positioner>
    </TooltipPrimitive.Portal>
  )
}

export {
  CLASSES_BULLE,
  CLASSES_FLECHE,
  Tooltip,
  TooltipTrigger,
  TooltipContent,
  TooltipProvider,
}
