import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "cn"

const DetailListDiscrete = createContext(false)

export interface DetailListProps extends ComponentProps<"dl"> {
  /** Métadonnées secondaires (identifiants, User-Agent…) : les paires
   *  s'écrivent « libellé : valeur » en petit et en discret, l'une après
   *  l'autre sur toute la largeur, et passent à la ligne au besoin. */
  discret?: boolean
}

/** Grille de paires libellé / valeur (`<dl>`) : une colonne sur téléphone,
 *  autant que la largeur en permet au-delà. */
export function DetailList({
  discret = false,
  className,
  ...props
}: DetailListProps) {
  return (
    <DetailListDiscrete.Provider value={discret}>
      <dl
        data-slot="detail-list"
        className={cn(
          discret
            ? "flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground"
            : "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]",
          className
        )}
        {...props}
      />
    </DetailListDiscrete.Provider>
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
  const discret = useContext(DetailListDiscrete)
  const vide =
    children === null ||
    children === undefined ||
    children === false ||
    children === ""
  return (
    <div
      data-slot="detail-item"
      className={cn(
        discret ? "min-w-0" : "flex min-w-0 flex-col gap-0.5",
        className
      )}
    >
      <dt className={discret ? "inline" : "text-xs text-muted-foreground"}>
        {libelle}
        {discret ? " : " : null}
      </dt>
      <dd className={cn("break-words", discret ? "inline" : "text-sm")}>
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
