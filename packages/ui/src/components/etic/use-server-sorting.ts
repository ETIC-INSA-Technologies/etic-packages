import { useMemo } from "react"
import type { OnChangeFn, SortingState } from "@tanstack/react-table"

/** Sens d'un tri. */
export type SensTri = "asc" | "desc"

export interface UseServerSortingOptions<K extends string> {
  /** Colonne triée (son identifiant est la clé de tri du serveur). */
  tri: K
  sens: SensTri
  /** Tri demandé par un en-tête ; `null` : tri retiré, l'application
   *  revient à son tri par défaut. */
  definirTri: (tri: K | null, sens: SensTri) => void
}

export interface UseServerSortingResultat {
  tri: SortingState
  onTriChange: OnChangeFn<SortingState>
  triManuel: true
}

/**
 * Le tri d'une liste triée par le serveur, tel que `useDataTable` le lit et
 * l'écrit : à étaler dans ses options. Les identifiants des colonnes
 * triables sont les clés de tri du serveur ; un seul tri à la fois.
 *
 * ```tsx
 * const table = useDataTable({
 *   donnees, colonnes, idLigne,
 *   ...useServerSorting({ tri, sens, definirTri }),
 * })
 * ```
 */
export function useServerSorting<K extends string>({
  tri: cle,
  sens,
  definirTri,
}: UseServerSortingOptions<K>): UseServerSortingResultat {
  const tri: SortingState = useMemo(
    () => [{ id: cle, desc: sens === "desc" }],
    [cle, sens]
  )
  const onTriChange: OnChangeFn<SortingState> = (miseAJour) => {
    const [premier] =
      typeof miseAJour === "function" ? miseAJour(tri) : miseAJour
    definirTri(
      (premier?.id as K | undefined) ?? null,
      premier?.desc ? "desc" : "asc"
    )
  }
  return { tri, onTriChange, triManuel: true }
}
