"use client"

import { Progress as ProgressPrimitive } from "@base-ui/react/progress"
import { cn } from "cn"

import { TONS, type StatusTon } from "@etic-ui/lib/ton"

// Écart avec shadcn : `ton` et `size` (voir ecarts-shadcn.test.ts), pour
// qu'une jauge d'occupation change de couleur et d'épaisseur sans viser ses
// parties par sélecteurs `[data-slot=…]`. « neutral » garde l'accent de
// shadcn.
const TAILLES = { default: "", lg: "h-2" } as const

type ProgressProps = ProgressPrimitive.Root.Props & {
  /** Couleur de la piste et du remplissage : « warning » au-delà d'un seuil
   *  d'alerte, « destructive » quand c'est plein. « neutral » (par défaut) :
   *  l'accent. */
  ton?: StatusTon
  /** Épaisseur de la piste : 4 px par défaut, comme shadcn ; « lg » (8 px)
   *  pour une jauge qui se lit seule. */
  size?: keyof typeof TAILLES
}

function Progress({
  className,
  children,
  value,
  ton = "neutral",
  size = "default",
  ...props
}: ProgressProps) {
  return (
    <ProgressPrimitive.Root
      value={value}
      data-slot="progress"
      className={cn("flex flex-wrap gap-3", className)}
      {...props}
    >
      {children}
      <ProgressTrack className={cn(TONS[ton].piste, TAILLES[size])}>
        <ProgressIndicator className={TONS[ton].remplissage} />
      </ProgressTrack>
    </ProgressPrimitive.Root>
  )
}

function ProgressTrack({ className, ...props }: ProgressPrimitive.Track.Props) {
  return (
    <ProgressPrimitive.Track
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-muted",
        className
      )}
      data-slot="progress-track"
      {...props}
    />
  )
}

function ProgressIndicator({
  className,
  ...props
}: ProgressPrimitive.Indicator.Props) {
  return (
    <ProgressPrimitive.Indicator
      data-slot="progress-indicator"
      className={cn("h-full bg-primary transition-all", className)}
      {...props}
    />
  )
}

function ProgressLabel({ className, ...props }: ProgressPrimitive.Label.Props) {
  return (
    <ProgressPrimitive.Label
      className={cn("text-sm font-medium", className)}
      data-slot="progress-label"
      {...props}
    />
  )
}

function ProgressValue({ className, ...props }: ProgressPrimitive.Value.Props) {
  return (
    <ProgressPrimitive.Value
      className={cn(
        "ml-auto text-sm text-muted-foreground tabular-nums",
        className
      )}
      data-slot="progress-value"
      {...props}
    />
  )
}

export {
  Progress,
  type ProgressProps,
  ProgressTrack,
  ProgressIndicator,
  ProgressLabel,
  ProgressValue,
}
