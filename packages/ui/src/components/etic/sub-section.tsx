import { useId, type ReactNode } from "react"
import { cn } from "cn"

export interface SubSectionProps {
  titre: ReactNode
  /** Sur la ligne du titre : un badge d'état, une action discrète. */
  aCote?: ReactNode
  /** Écart entre le titre et le contenu (`gap-2` par défaut), largeur. */
  className?: string
  children: ReactNode
}

/**
 * Un bloc titré dans une carte, un tiroir ou un dialogue : une `section`
 * nommée par son titre (`<h3>`, sous le `<h2>` d'une `SectionCard`), puis
 * son contenu.
 */
export function SubSection({
  titre,
  aCote,
  className,
  children,
}: SubSectionProps) {
  const id = useId()
  const entete = (
    <h3 id={id} className="text-sm font-medium">
      {titre}
    </h3>
  )
  return (
    <section
      aria-labelledby={id}
      data-slot="sub-section"
      className={cn("flex min-w-0 flex-col gap-2", className)}
    >
      {aCote ? (
        <div className="flex flex-wrap items-center gap-2">
          {entete}
          {aCote}
        </div>
      ) : (
        entete
      )}
      {children}
    </section>
  )
}
