import { cn } from "cn"

import { Card, CardContent } from "@etic-ui/components/ui/card"
import { Skeleton } from "@etic-ui/components/ui/skeleton"
import { SpinnerDecoratif } from "@etic-ui/components/ui/spinner"

// Défini à côté de `Spinner` (le `Button` occupé s'en sert) ; réexporté ici
// pour les imports internes existants.
export { SpinnerDecoratif }

export interface LoadingProps {
  /** Annoncé aux lecteurs d'écran à chaque changement ; « Chargement… »
   *  par défaut. */
  libelle?: string
  className?: string
}

/** Attente sans forme connue : roue et libellé, annoncés poliment
 *  (`role="status"`). */
export function Loading({ libelle = "Chargement…", className }: LoadingProps) {
  return (
    <div
      role="status"
      className={cn(
        "flex items-center justify-center gap-2 py-8 text-sm text-muted-foreground",
        className
      )}
    >
      <SpinnerDecoratif />
      {libelle}
    </div>
  )
}

/** Les squelettes sont décoratifs : ce statut masqué dit qu'on charge. */
function StatutChargement() {
  return (
    <span className="sr-only" role="status">
      Chargement…
    </span>
  )
}

const LARGEURS = ["w-[70%]", "w-[55%]", "w-[80%]", "w-[40%]", "w-[60%]"]

export interface SkeletonTableProps {
  /** 5 par défaut. */
  lignes?: number
  /** 4 par défaut. */
  colonnes?: number
  className?: string
}

/** Lignes de barres, à la place d'un tableau qui charge. */
export function SkeletonTable({
  lignes = 5,
  colonnes = 4,
  className,
}: SkeletonTableProps) {
  return (
    <div className={cn("flex flex-col gap-3 py-2", className)}>
      <StatutChargement />
      {Array.from({ length: lignes }, (_, ligne) => (
        <div
          key={ligne}
          aria-hidden
          className="grid gap-4"
          style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}
        >
          {Array.from({ length: colonnes }, (_, colonne) => (
            <Skeleton
              key={colonne}
              className={cn(
                "h-4",
                LARGEURS[(ligne + colonne) % LARGEURS.length]
              )}
            />
          ))}
        </div>
      ))}
    </div>
  )
}

export interface SkeletonCardProps {
  /** 3 par défaut. */
  lignes?: number
  /**
   * Porte le statut « Chargement… » ; vrai par défaut. Faux quand la carte
   * fait partie d'un squelette qui l'annonce déjà (une seule annonce par
   * zone qui charge).
   */
  annoncer?: boolean
  className?: string
}

/** Une carte de lignes de texte, pour une fiche ou un résumé. */
export function SkeletonCard({
  lignes = 3,
  annoncer = true,
  className,
}: SkeletonCardProps) {
  return (
    <Card className={className}>
      <CardContent className="flex flex-col gap-3">
        {annoncer ? <StatutChargement /> : null}
        {Array.from({ length: lignes }, (_, index) => (
          <Skeleton
            key={index}
            aria-hidden
            className={cn("h-4", LARGEURS[(index + 3) % LARGEURS.length])}
          />
        ))}
      </CardContent>
    </Card>
  )
}

export interface SkeletonPageProps {
  className?: string
}

/** Une fiche qui charge : la ligne du titre, puis deux cartes ; un seul
 *  statut « Chargement… ». */
export function SkeletonPage({ className }: SkeletonPageProps) {
  return (
    <div className={cn("flex flex-col gap-6", className)}>
      <StatutChargement />
      <div aria-hidden className="flex flex-col gap-2">
        <Skeleton className="h-4 w-40" />
        <Skeleton className="h-7 w-72 max-w-full" />
      </div>
      <SkeletonCard lignes={4} annoncer={false} />
      <SkeletonCard lignes={3} annoncer={false} />
    </div>
  )
}
