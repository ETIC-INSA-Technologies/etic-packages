import type { ReactNode } from "react"
import { InboxIcon } from "lucide-react"

import { EmptyState } from "@etic-ui/components/etic/empty-state"
import { ErrorBanner } from "@etic-ui/components/etic/error-banner"
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
}

function videParDefaut(donnees: unknown) {
  if (Array.isArray(donnees)) return donnees.length === 0
  const items = (donnees as { items?: unknown } | null)?.items
  return Array.isArray(items) && items.length === 0
}

/**
 * Les quatre états d'une requête, partout pareils : squelette pendant le
 * chargement, bandeau d'erreur avec « Réessayer », état vide, puis les
 * données. La page n'écrit que le dernier.
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
}: QueryBoundaryProps<T>) {
  const { data, refetch } = requete
  const chargement = enAttente || requete.isLoading

  const erreur =
    requete.isError && !enAttente ? (
      <ErrorBanner
        erreur={requete.error}
        onReessayer={refetch ? () => void refetch() : undefined}
        enCours={!!requete.isFetching}
      />
    ) : null

  let contenu: ReactNode = null
  if (chargement) contenu = squelette ?? <SkeletonTable />
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
