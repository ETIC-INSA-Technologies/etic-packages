import { Children, isValidElement, type ReactNode } from "react"
import { cn } from "cn"
import { ExternalLinkIcon } from "lucide-react"

import { useLien, type LienComposant } from "@etic-ui/components/etic/lien"
import { NOUVEL_ONGLET } from "@etic-ui/components/etic/external-link"

export interface DetailMetaProps {
  /** Les éléments de la ligne, un par enfant ; un enfant `null` ou `false`
   *  (élément absent) ne laisse ni place ni point. */
  children: ReactNode
  className?: string
}

/**
 * Ligne d'informations sous le titre d'une fiche (`meta` de `DetailHeader`) :
 * ses éléments séparés par des points, passant à la ligne quand la place
 * manque. Une rangée ne commence jamais par un point : celui d'un élément en
 * début de rangée tombe dans une marge négative masquée. Tout y est du ton
 * de la ligne ; les liens (`DetailMetaLink`) s'y distinguent au survol.
 */
export function DetailMeta({ children, className }: DetailMetaProps) {
  const elements = Children.toArray(children)
  if (elements.length === 0) return null
  return (
    // `overflow-hidden` masque le point de tête de chaque rangée, logé dans
    // la marge négative `-ml-4` ; `-m-1 p-1` laisse la place à l'anneau de
    // focus des liens.
    <span
      data-slot="detail-meta"
      className={cn("-m-1 block overflow-hidden p-1", className)}
    >
      <span className="-ml-4 flex flex-wrap items-center gap-y-1">
        {elements.map((element, index) => (
          <span
            key={isValidElement(element) ? element.key : index}
            data-slot="detail-meta-item"
            // Le point est hors de l'élément : il ne se souligne pas avec
            // un lien survolé.
            className="inline-flex min-w-0 items-center before:w-4 before:shrink-0 before:text-center before:content-['·']"
          >
            {element}
          </span>
        ))}
      </span>
    </span>
  )
}

export interface DetailMetaLinkProps {
  href: string
  /** Page hébergée ailleurs : nouvel onglet, flèche sortante. */
  externe?: boolean
  /** Composant de lien du routeur ; par défaut, celui du `LienProvider`. */
  lien?: LienComposant
  className?: string
  children: ReactNode
}

const CLASSES_LIEN =
  "inline-flex items-center gap-1 rounded-sm underline-offset-4 outline-none hover:text-foreground hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"

/** Lien de la ligne d'informations : discret, du ton de la ligne, souligné
 *  au survol ; une flèche sortante pour ce qui s'ouvre ailleurs. */
export function DetailMetaLink({
  href,
  externe = false,
  lien,
  className,
  children,
}: DetailMetaLinkProps) {
  const Lien = useLien(lien)
  if (externe)
    return (
      <a
        href={href}
        {...NOUVEL_ONGLET}
        data-slot="detail-meta-link"
        className={cn(CLASSES_LIEN, className)}
      >
        {children}
        <ExternalLinkIcon className="size-3.5" aria-hidden="true" />
        <span className="sr-only"> (nouvel onglet)</span>
      </a>
    )
  return (
    // `Lien` vient des props ou du contexte : stable (voir `useLien`).
    // eslint-disable-next-line react-hooks/static-components
    <Lien
      href={href}
      data-slot="detail-meta-link"
      className={cn(CLASSES_LIEN, className)}
    >
      {children}
    </Lien>
  )
}
