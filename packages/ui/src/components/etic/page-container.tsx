import type { ComponentProps } from "react"
import { cn } from "cn"

/** Largeur maximale du contenu ; « full » : toute la largeur disponible. */
export type PageContainerLargeur = "md" | "lg" | "xl" | "full"

const LARGEURS: Record<PageContainerLargeur, string> = {
  md: "max-w-3xl",
  lg: "max-w-5xl",
  xl: "max-w-7xl",
  full: "",
}

export interface PageContainerProps extends ComponentProps<"div"> {
  /** « full » par défaut (listes, tableaux) ; « md » pour un formulaire ou
   *  une fiche à lire, « lg » ou « xl » entre les deux. Le contenu limité
   *  est centré. */
  largeur?: PageContainerLargeur
}

/**
 * Conteneur d'une page, dans le `<main>` d'`AppShell` : marges autour du
 * contenu (resserrées sur téléphone), largeur maximale, et espacement
 * vertical régulier entre les blocs (en-tête, cartes, tableau), sur le
 * modèle des blocs « dashboard » de shadcn. Chaque page enveloppe son
 * contenu dedans plutôt que de poser ses propres marges.
 */
export function PageContainer({
  largeur = "full",
  className,
  ...props
}: PageContainerProps) {
  return (
    <div
      data-slot="page-container"
      data-largeur={largeur}
      className={cn(
        "mx-auto flex w-full min-w-0 flex-1 flex-col gap-6 px-4 py-6 min-[1025px]:px-8 min-[1025px]:py-8 sm:px-6",
        LARGEURS[largeur],
        className
      )}
      {...props}
    />
  )
}
