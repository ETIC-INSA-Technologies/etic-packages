import type { ReactNode } from "react"
import { cn } from "cn"

import { useLien, type LienComposant } from "@etic-ui/components/etic/lien"

export interface NavTabsLien {
  libelle: ReactNode
  href: string
  /** La page à l'écran. Calculé par l'application (son routeur). */
  actif?: boolean
}

export interface NavTabsProps {
  /** Nom de la barre pour les lecteurs d'écran : « Paramètres ». */
  libelle: string
  liens: NavTabsLien[]
  /** Composant de lien du routeur ; par défaut, celui du `LienProvider`,
   *  sinon un `<a>`. */
  lien?: LienComposant
  className?: string
}

/**
 * Barre d'onglets dont chaque onglet est une page (une route) : des liens,
 * pas des onglets ARIA (`Tabs`), si bien qu'un lien mène à l'onglet voulu et
 * qu'une garde de saisie retient la navigation. L'onglet actif est souligné
 * et annoncé (`aria-current="page"`). Trop large pour l'écran, la barre
 * défile de côté ; le trait de base est une ombre intérieure, sous le
 * soulignement : rien ne déborde du conteneur défilant, qui n'a donc jamais
 * de barre de défilement verticale parasite.
 */
export function NavTabs({ libelle, liens, lien, className }: NavTabsProps) {
  const Lien = useLien(lien)
  return (
    <nav
      aria-label={libelle}
      data-slot="nav-tabs"
      className={cn(
        "flex gap-4 overflow-x-auto overflow-y-hidden shadow-[inset_0_-1px_0_var(--border)] sm:gap-6",
        className
      )}
    >
      {liens.map(({ libelle: texte, href, actif = false }) => (
        <Lien
          key={href}
          href={href}
          aria-current={actif ? "page" : undefined}
          data-actif={actif || undefined}
          className={cn(
            // L'anneau de focus est intérieur : à l'extérieur, le conteneur
            // défilant le couperait.
            "shrink-0 rounded-t-sm border-b-2 px-0.5 pb-2.5 text-sm font-medium whitespace-nowrap no-underline transition-colors outline-none focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:ring-inset",
            actif
              ? "border-foreground text-foreground"
              : "border-transparent text-muted-foreground hover:text-foreground"
          )}
        >
          {texte}
        </Lien>
      ))}
    </nav>
  )
}
