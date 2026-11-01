import type { ComponentProps } from "react"
import { cn } from "cn"

export type CenteredScreenProps = ComponentProps<"main">

/**
 * Écran hors de la coquille (connexion, retour du fournisseur d'identité,
 * page introuvable, vérification de la session) : le contenu centré dans
 * toute la hauteur, sur le fond estompé, comme les blocs de connexion de
 * shadcn. C'est le `<main>` de la page.
 *
 * Écart avec shadcn : `bg-muted/40` au lieu de `bg-muted`, un fond moins
 * appuyé, surtout en sombre où `--muted` est plus clair que la carte posée
 * dessus.
 */
export function CenteredScreen({ className, ...props }: CenteredScreenProps) {
  return (
    <main
      data-slot="centered-screen"
      className={cn(
        "flex min-h-svh w-full flex-col items-center justify-center gap-6 bg-muted/40 p-6 md:p-10",
        className
      )}
      {...props}
    />
  )
}
