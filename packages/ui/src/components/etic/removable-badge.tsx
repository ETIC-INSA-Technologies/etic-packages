import {
  Children,
  Fragment,
  isValidElement,
  type ComponentProps,
  type ReactNode,
} from "react"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Badge } from "@etic-ui/components/ui/badge"
import { TooltipButton } from "@etic-ui/components/etic/tooltip-button"

type RetraitProps =
  | {
      /** Retire l'élément. Sans gestionnaire, aucun bouton : un badge du même
       *  gabarit, aligné sur ses voisins retirables. */
      onRetirer: () => void
      /** Nom accessible et infobulle du bouton, qui nomme l'élément :
       *  « Retirer le groupe Bureau ». */
      libelleRetirer: string
      /** Retrait en cours : le bouton est occupé (`aria-busy`), ignore les
       *  clics, mais garde le focus. */
      enCours?: boolean
      /** Retrait impossible : le bouton reste focalisable et son infobulle
       *  dit pourquoi. */
      verrou?: string
    }
  | {
      onRetirer?: undefined
      libelleRetirer?: undefined
      enCours?: undefined
      verrou?: undefined
    }

export type RemovableBadgeProps = ComponentProps<typeof Badge> & RetraitProps

/** Enfants du libellé à plat (fragments dépliés), chaque suite de textes nus
 *  dans son `<span>` : dans le libellé flex, seul un élément peut se couper
 *  (`truncate`), pas un nœud texte. */
function elementsDuLibelle(children: ReactNode): ReactNode[] {
  const aplat = (noeuds: ReactNode): ReactNode[] =>
    Children.toArray(noeuds).flatMap((enfant) =>
      isValidElement<{ children?: ReactNode }>(enfant) &&
      enfant.type === Fragment
        ? aplat(enfant.props.children)
        : [enfant]
    )
  const elements: ReactNode[] = []
  let texte: (string | number)[] = []
  const fermerTexte = () => {
    if (texte.length === 0) return
    elements.push(<span key={elements.length}>{texte}</span>)
    texte = []
  }
  for (const enfant of aplat(children)) {
    if (typeof enfant === "string" || typeof enfant === "number") {
      texte.push(enfant)
    } else {
      fermerTexte()
      // Clé par position : celles de `Children.toArray` peuvent se répéter
      // d'un fragment déplié à l'autre.
      elements.push(<Fragment key={elements.length}>{enfant}</Fragment>)
    }
  }
  fermerTexte()
  return elements
}

/**
 * Élément d'une liste qu'on peut retirer (groupe d'un membre, permission d'un
 * groupe) : un `Badge` de 28 px (`size="lg"`, « secondary » par défaut)
 * terminé par une croix, un `TooltipButton` rond. Placer les badges dans une
 * liste nommée (`<ul aria-label="Groupes du membre">`).
 */
export function RemovableBadge({
  onRetirer,
  libelleRetirer,
  enCours = false,
  verrou,
  variant = "secondary",
  size = "lg",
  className,
  children,
  ...props
}: RemovableBadgeProps) {
  return (
    <Badge
      variant={variant}
      size={size}
      className={cn("max-w-full", className)}
      {...props}
    >
      {/* Un libellé trop long pour la liste est coupé, la croix reste. Le
          premier élément (le texte) se coupe ; ceux qui le suivent (cadenas
          d'un élément critique…) restent entiers, centrés à 4 px de lui,
          comme les icônes d'un `Badge`. */}
      <span
        data-slot="removable-badge-label"
        className="flex min-w-0 items-center gap-1 *:shrink-0 *:first:shrink *:first:truncate"
      >
        {elementsDuLibelle(children)}
      </span>
      {onRetirer ? (
        <TooltipButton
          variant="ghost"
          size="icon-xs"
          // La croix colle au bord arrondi du badge, comme ComboboxChip. Son
          // anneau de focus est intérieur : le badge (`overflow-hidden`)
          // couperait un anneau extérieur.
          className="-mr-1.5 rounded-full focus-visible:ring-0 focus-visible:inset-ring-2 focus-visible:inset-ring-ring"
          // Nom de la croix (icône seule) : l'infobulle.
          infobulle={libelleRetirer}
          verrou={verrou}
          enCours={enCours}
          onClick={onRetirer}
        >
          <XIcon />
        </TooltipButton>
      ) : null}
    </Badge>
  )
}
