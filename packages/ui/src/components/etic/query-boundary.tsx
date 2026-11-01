import type { ReactNode } from "react"
import { InboxIcon, SearchXIcon } from "lucide-react"

import { EmptyState } from "@etic-ui/components/etic/empty-state"
import {
  ErrorBanner,
  type ErrorBannerProps,
} from "@etic-ui/components/etic/error-banner"
import { SkeletonTable } from "@etic-ui/components/etic/loading"

/**
 * Ce que `QueryBoundary` lit d'une requête : le résultat de `useQuery` de
 * TanStack Query convient tel quel. Décrit ici plutôt qu'importé, pour que
 * la bibliothèque n'exige pas `@tanstack/react-query`, même pour ses types.
 */
export interface QueryBoundaryRequete<T> {
  data: T | undefined
  error: unknown
  isError: boolean
  /** Premier chargement en cours (et non une requête désactivée). */
  isLoading: boolean
  /** Requête en cours, premier chargement ou non : après « Réessayer »,
   *  le bandeau d'erreur reste en place, son bouton occupé, le temps de la
   *  nouvelle tentative (le focus n'est pas perdu). */
  isFetching?: boolean
  refetch?: () => unknown
}

export interface QueryBoundaryProps<T> {
  requete: QueryBoundaryRequete<T>
  /** Rendu des données chargées. */
  children: (donnees: T) => ReactNode
  /**
   * Affiché quand les données sont vides : une chaîne devient le titre d'un
   * `EmptyState` (icône de boîte vide), un nœud (un `EmptyState` avec une
   * description et une action…) est rendu tel quel. Sans lui, pas d'état
   * vide.
   */
  vide?: ReactNode
  /** Les données sont-elles vides ? Par défaut : un tableau vide, ou un
   *  objet dont `items` est un tableau vide (réponse paginée). */
  estVide?: (donnees: T) => boolean
  /** Pendant le chargement, à la forme du contenu ; des lignes par défaut. */
  squelette?: ReactNode
  /** Force le chargement : requête qui attend encore son entrée (une
   *  requête désactivée n'est ni en cours ni chargée). */
  enAttente?: boolean
  /**
   * Affiché à la place du bandeau d'erreur quand l'élément demandé n'existe
   * pas (fiche supprimée, adresse erronée) : une chaîne devient le titre d'un
   * `EmptyState`, un nœud (avec un lien de retour…) est rendu tel quel. Sans
   * lui, « introuvable » est une erreur comme une autre. « Introuvable » : une
   * erreur de `status` 404 (`ErreurApi` de `@etic-insa/auth`, ou toute erreur
   * de même forme). Les autres échecs (réseau, 500…) gardent le bandeau et
   * « Réessayer » : ils ne sont jamais annoncés comme « introuvable ».
   */
  introuvable?: ReactNode
}

function videParDefaut(donnees: unknown) {
  if (Array.isArray(donnees)) return donnees.length === 0
  const items = (donnees as { items?: unknown } | null)?.items
  return Array.isArray(items) && items.length === 0
}

/** Une erreur de statut HTTP 404, lue par sa forme. */
function erreurIntrouvable(erreur: unknown): boolean {
  return (
    typeof erreur === "object" &&
    erreur !== null &&
    (erreur as { status?: unknown }).status === 404
  )
}

export interface QueryErrorBannerProps extends Omit<
  ErrorBannerProps,
  "erreur" | "onReessayer" | "enCours"
> {
  /** Le résultat de `useQuery` convient tel quel. */
  requete: Pick<
    QueryBoundaryRequete<unknown>,
    "isError" | "error" | "isFetching" | "refetch"
  >
}

/**
 * L'échec d'une requête de lecture, avec « Réessayer » (occupé pendant la
 * nouvelle tentative) ; rien tant qu'elle n'a pas échoué. Le bandeau de
 * `QueryBoundary`, pour une page qui place elle-même ses données (liste
 * gardée à l'écran, plusieurs requêtes…).
 */
export function QueryErrorBanner({ requete, ...props }: QueryErrorBannerProps) {
  if (!requete.isError) return null
  const { refetch } = requete
  return (
    <ErrorBanner
      erreur={requete.error}
      onReessayer={refetch ? () => void refetch() : undefined}
      enCours={!!requete.isFetching}
      {...props}
    />
  )
}

/**
 * Les quatre états d'une requête, partout pareils : squelette pendant le
 * chargement, bandeau d'erreur avec « Réessayer », état vide, puis les
 * données. La page n'écrit que le dernier. Une fiche ajoute `introuvable`
 * (404), distinct d'une panne.
 *
 * Aucune enveloppe : le bandeau et le contenu sont rendus directement dans
 * le parent (grille, flex…), qui règle l'espacement (`flex flex-col gap-4`
 * par exemple). Le bandeau occupe toujours la même place, avant le contenu
 * (vide sans erreur) : l'échec d'une actualisation l'affiche au-dessus des
 * données sans démonter celles-ci (saisie, sélection, défilement gardés).
 */
export function QueryBoundary<T>({
  requete,
  children,
  vide,
  estVide = videParDefaut,
  squelette,
  enAttente = false,
  introuvable,
}: QueryBoundaryProps<T>) {
  const { data } = requete
  const chargement = enAttente || requete.isLoading
  const enErreur = requete.isError && !enAttente
  // `null` ou `false` valent « non fourni » : le bandeau habituel.
  const introuvableActif =
    introuvable !== undefined &&
    introuvable !== null &&
    introuvable !== false &&
    enErreur &&
    erreurIntrouvable(requete.error)

  const erreur =
    enErreur && !introuvableActif ? (
      <QueryErrorBanner requete={requete} />
    ) : null

  let contenu: ReactNode = null
  if (introuvableActif) {
    // À la place du contenu : pas de « Réessayer » (l'élément n'existe pas),
    // ni de données d'avant (la fiche a disparu entre-temps).
    contenu =
      typeof introuvable === "string" ? (
        <EmptyState titre={introuvable} icone={SearchXIcon} />
      ) : (
        introuvable
      )
  } else if (chargement) contenu = squelette ?? <SkeletonTable />
  else if (data !== undefined) {
    contenu =
      vide !== undefined && estVide(data) ? (
        typeof vide === "string" ? (
          <EmptyState titre={vide} icone={InboxIcon} />
        ) : (
          vide
        )
      ) : (
        children(data)
      )
  }

  // Deux places fixes : `null` garde celle du bandeau absent, si bien que le
  // contenu ne change pas de position (ni n'est remonté) quand il apparaît.
  return (
    <>
      {erreur}
      {contenu}
    </>
  )
}
