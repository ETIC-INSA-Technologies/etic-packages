import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "cn"

/** Mise en page des paires d'une `DetailList` :
 *  - `grille` : libellé au-dessus de la valeur, une colonne sur téléphone,
 *    autant que la largeur en permet au-delà ;
 *  - `pile` : libellé au-dessus de la valeur, une seule colonne sur toute la
 *    largeur quelle que soit la place (carte étroite, dialogue, valeurs
 *    longues) ;
 *  - `ligne` : métadonnées secondaires (identifiants, User-Agent…), « libellé :
 *    valeur » en petit et en discret, l'une après l'autre sur toute la largeur,
 *    avec passage à la ligne au besoin. */
export type DetailListDisposition = "grille" | "pile" | "ligne"

const DispositionContext = createContext<DetailListDisposition>("grille")

const CLASSES_LISTE: Record<DetailListDisposition, string> = {
  grille:
    "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(14rem,1fr))]",
  pile: "grid grid-cols-1 gap-y-4",
  ligne: "flex flex-wrap gap-x-6 gap-y-1 text-xs text-muted-foreground",
}

export interface DetailListProps extends ComponentProps<"dl"> {
  /** `grille` par défaut ; voir `DetailListDisposition`. */
  disposition?: DetailListDisposition
}

/** Liste de paires libellé / valeur (`<dl>`), disposée selon `disposition`. */
export function DetailList({
  disposition = "grille",
  className,
  ...props
}: DetailListProps) {
  return (
    <DispositionContext.Provider value={disposition}>
      <dl
        data-slot="detail-list"
        data-disposition={disposition}
        className={cn(CLASSES_LISTE[disposition], className)}
        {...props}
      />
    </DispositionContext.Provider>
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
  const enLigne = useContext(DispositionContext) === "ligne"
  const vide =
    children === null ||
    children === undefined ||
    children === false ||
    children === ""
  return (
    <div
      data-slot="detail-item"
      className={cn(
        enLigne ? "min-w-0" : "flex min-w-0 flex-col gap-0.5",
        className
      )}
    >
      <dt className={enLigne ? "inline" : "text-xs text-muted-foreground"}>
        {libelle}
        {enLigne ? " : " : null}
      </dt>
      <dd className={cn("break-words", enLigne ? "inline" : "text-sm")}>
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
