import { useEffect, useLayoutEffect, useRef } from "react"

import type { DataTableUnite } from "@etic-ui/components/etic/data-table-format"
import type { DataTablePaginationDecalageProps } from "@etic-ui/components/etic/data-table-pagination"
import type { DataTableCountNombresProps } from "@etic-ui/components/etic/data-table-toolbar"

/** La requête d'une page, telle que la rend `useQuery` (TanStack Query). */
export interface ServerPageRequete {
  data?: { total: number; items: readonly unknown[] }
  /** Page conservée d'une requête précédente (`keepPreviousData`) : son
   *  total ne vaut pas pour le décalage demandé. */
  isPlaceholderData?: boolean
}

export interface UseServerPaginationOptions {
  /** Rang (à partir de 0) du premier élément demandé. */
  decalage: number
  /** Nombre d'éléments par page. */
  limite: number
  onDecalageChange: (decalage: number) => void
  /** Sans lui, pas de choix du nombre par page. */
  onLimiteChange?: (limite: number) => void
  requete: ServerPageRequete
  /** Nom des éléments, pour le compteur. */
  unite?: DataTableUnite
  /** Accorde « affichées » au féminin. */
  feminin?: boolean
  /** Nombres d'éléments par page proposés (ceux de `DataTablePagination`
   *  par défaut). */
  limites?: readonly number[]
}

export interface UseServerPaginationResultat {
  /** Pour `compteur` de `DataTableToolbar` ; `undefined` avant la première
   *  page. */
  compteur?: DataTableCountNombresProps
  /** Pour `DataTablePagination` ; `undefined` avant la première page. */
  pagination?: DataTablePaginationDecalageProps
}

/**
 * La page reçue d'une liste paginée côté serveur, prête pour le compteur de
 * `DataTableToolbar` et pour `DataTablePagination`. Un décalage au-delà du
 * total (lien vers la page 5 d'une liste qui n'en compte plus que deux,
 * suppression qui vide la dernière page) ramène à la dernière page, au lieu
 * d'afficher « aucun élément » sans pagination pour revenir. Seule la
 * réponse de la requête courante compte, pas une page conservée.
 *
 * ```tsx
 * const page = useServerPagination({
 *   decalage, limite, onDecalageChange: setDecalage, onLimiteChange: setLimite,
 *   requete: membres, unite: { singulier: "membre", pluriel: "membres" },
 * })
 * <DataTableToolbar compteur={page.compteur} … />
 * {page.pagination ? <DataTablePagination {...page.pagination} /> : null}
 * ```
 */
export function useServerPagination({
  decalage,
  limite,
  onDecalageChange,
  onLimiteChange,
  requete,
  unite,
  feminin = false,
  limites,
}: UseServerPaginationOptions): UseServerPaginationResultat {
  const reelle = requete.isPlaceholderData ? undefined : requete.data
  const horsLimites =
    reelle !== undefined &&
    reelle.items.length === 0 &&
    reelle.total > 0 &&
    decalage >= reelle.total
  const derniere = reelle ? Math.floor((reelle.total - 1) / limite) * limite : 0
  // `onDecalageChange` écrit en ligne ne doit pas relancer le recadrage : il
  // est lu du dernier rendu.
  const recadrer = useRef(onDecalageChange)
  useLayoutEffect(() => {
    recadrer.current = onDecalageChange
  })
  useEffect(() => {
    if (horsLimites) recadrer.current(derniere)
  }, [horsLimites, derniere])

  const page = requete.data
  if (!page) return {}
  return {
    compteur: {
      total: page.total,
      decalage,
      nombre: page.items.length,
      unite,
      feminin,
    },
    pagination: {
      total: page.total,
      decalage,
      limite,
      limites,
      onDecalageChange,
      onLimiteChange,
    },
  }
}
