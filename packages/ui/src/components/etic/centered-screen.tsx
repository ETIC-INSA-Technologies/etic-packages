import type { ComponentProps, ReactNode } from "react"
import { cn } from "cn"
import type { LucideIcon } from "lucide-react"

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

export interface MessageScreenProps extends Omit<
  CenteredScreenProps,
  "children"
> {
  /** Titre de la page (`<h1>`) : « Page introuvable ». */
  titre: ReactNode
  /** Phrase sous le titre : pourquoi, et ce que la personne peut faire. */
  description?: ReactNode
  /** Icône lucide (le composant : `icone={SearchXIcon}`), dans sa pastille. */
  icone?: LucideIcon
  /** Le geste suivant : un lien de retour, un bouton. */
  actions?: ReactNode
}

/**
 * Écran entier qui ne dit qu'une chose (page introuvable, lien incomplet ou
 * expiré, accès refusé) : icône, titre, phrase et actions, centrés dans la
 * fenêtre, sur un `CenteredScreen` (dont il relaie les attributs). Un seul
 * gabarit pour que ces écrans se ressemblent d'une application à l'autre.
 */
export function MessageScreen({
  titre,
  description,
  icone: Icone,
  actions,
  ...props
}: MessageScreenProps) {
  return (
    <CenteredScreen {...props}>
      <div
        data-slot="message-screen"
        className="flex max-w-md flex-col items-center gap-4 text-center"
      >
        {Icone ? (
          <div className="flex size-12 items-center justify-center rounded-full bg-muted text-muted-foreground">
            <Icone className="size-6" aria-hidden="true" />
          </div>
        ) : null}
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold tracking-tight">{titre}</h1>
          {description ? (
            <p className="text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {actions ? (
          <div className="flex flex-wrap justify-center gap-2">{actions}</div>
        ) : null}
      </div>
    </CenteredScreen>
  )
}
