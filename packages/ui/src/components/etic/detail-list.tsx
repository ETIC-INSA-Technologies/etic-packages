import {
  createContext,
  useContext,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "cn"

/** Mise en page des paires d'une `DetailList` :
 *  - `grille` : libellé au-dessus de la valeur, une colonne sur téléphone,
 *    au-delà autant que la largeur en permet, quatre au plus (deux paires sur
 *    un écran large : la moitié gauche, de l'air à droite, pas deux colonnes
 *    étroites devant six vides) ;
 *  - `pile` : libellé au-dessus de la valeur, une seule colonne sur toute la
 *    largeur quelle que soit la place (carte étroite, dialogue, valeurs
 *    longues) ;
 *  - `ligne` : métadonnées secondaires (identifiants, User-Agent…), « libellé :
 *    valeur » en petit et en discret, l'une après l'autre sur toute la largeur,
 *    avec passage à la ligne au besoin. */
export type DetailListDisposition = "grille" | "pile" | "ligne"

const DispositionContext = createContext<DetailListDisposition>("grille")

const CLASSES_LISTE: Record<DetailListDisposition, string> = {
  // Colonnes d'au moins 14rem et d'au moins un quart de la largeur (trois
  // écarts de `gap-x-6` déduits, 1px de marge pour que l'arrondi ne tombe pas
  // à trois) : quatre colonnes au plus. `auto-fill` garde les colonnes vides,
  // qui laissent de l'air à droite d'une liste courte.
  grille:
    "grid grid-cols-1 gap-x-6 gap-y-4 sm:grid-cols-[repeat(auto-fill,minmax(max(14rem,calc((100%-4.5rem)/4-1px)),1fr))]",
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
