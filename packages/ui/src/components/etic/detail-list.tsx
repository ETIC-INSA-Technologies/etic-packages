import type { ComponentProps, ReactNode } from "react"
import { cn } from "cn"

export type DetailListProps = ComponentProps<"dl">

/** Grille de paires libellé / valeur (`<dl>`) : une colonne sur téléphone,
 *  autant que la largeur en permet au-delà. */
export function DetailList({ className, ...props }: DetailListProps) {
  return (
    <dl
      data-slot="detail-list"
      className={cn(
        "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]",
        className
      )}
      {...props}
    />
  )
}

export interface DetailItemProps {
  libelle: ReactNode
  /** La valeur ; absente (`null`, `undefined`, `false`, chaîne vide), elle
   *  s'affiche « — », en discret. `false` couvre le motif `{cond && x}`. */
  children?: ReactNode
  className?: string
}

/** Une paire libellé / valeur, dans une `DetailList`. */
export function DetailItem({ libelle, children, className }: DetailItemProps) {
  const vide =
    children === null ||
    children === undefined ||
    children === false ||
    children === ""
  return (
    <div
      data-slot="detail-item"
      className={cn("flex min-w-0 flex-col gap-0.5", className)}
    >
      <dt className="text-xs text-muted-foreground">{libelle}</dt>
      <dd className="text-sm break-words">
        {vide ? (
          <span className="text-muted-foreground">
            <span aria-hidden>—</span>
            <span className="sr-only">Non renseigné</span>
          </span>
        ) : (
          children
        )}
      </dd>
    </div>
  )
}
