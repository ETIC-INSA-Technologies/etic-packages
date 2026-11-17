import { useCallback, useLayoutEffect, useMemo, useRef } from "react"

import { LIMITES_PAGINATION } from "@etic-ui/components/etic/data-table-pagination"
import type { UseDetailSheetOptions } from "@etic-ui/components/etic/use-detail-sheet"
import type { UseServerPaginationOptions } from "@etic-ui/components/etic/use-server-pagination"
import type { SensTri } from "@etic-ui/components/etic/use-server-sorting"
import { useDebouncedSearch } from "@etic-ui/hooks/use-debounced-search"

/** Paramètres d'URL de la disposition d'une liste (page, taille, tri) : une
 *  réinitialisation des filtres les garde. */
const CLES_DISPOSITION = new Set(["offset", "limit", "tri", "sens"])

/** Paramètres d'URL de la page (rang et taille), hors de la `selection`. */
const CLES_PAGE = ["offset", "limit"]

/** Paramètre de la recherche libre. */
const RECHERCHE = "recherche"

export interface UseListUrlStateOptions<
  K extends string,
  T extends string | undefined = undefined,
> {
  /** Paramètres de l'URL courante (`useSearchParams()[0]` de react-router). */
  params: URLSearchParams
  /**
   * Remplace les paramètres de l'URL, **sans nouvelle entrée d'historique** :
   * `(p) => setSearchParams(p, { replace: true })`. Peut être écrite en ligne.
   */
  onParamsChange: (params: URLSearchParams) => void
  /** Clés de tri acceptées (celles du serveur) : un `?tri=` inconnu ou
   *  périmé retombe sur le tri par défaut au lieu d'être envoyé. */
  clesTri: readonly K[]
  /** Tri par défaut, jamais écrit dans l'URL. */
  tri: K
  sens: SensTri
  /** Nombre par page par défaut (25), jamais écrit dans l'URL. */
  limite?: number
  /** Nombres par page acceptés (`LIMITES_PAGINATION` par défaut) : les
   *  mêmes que ceux de `DataTablePagination`. */
  limites?: readonly number[]
  /** Paramètres de vue (élément ouvert dans un tiroir…) : ni filtres ni
   *  disposition, une réinitialisation des filtres les garde. */
  vue?: readonly string[]
  /**
   * Paramètre du tiroir de détail de la liste (`"document"` pour
   * `?document=12`) : un paramètre de `vue`, rendu prêt pour
   * `useDetailSheet` dans `tiroir`.
   */
  tiroir?: T
}

/** La page de l'URL, aux noms des options de `useServerPagination`. */
export type ListUrlPagination = Required<
  Pick<
    UseServerPaginationOptions,
    "decalage" | "limite" | "onDecalageChange" | "onLimiteChange" | "limites"
  >
>

/** Le tiroir de l'URL, aux noms des options de `useDetailSheet`. */
export type ListUrlTiroir = Pick<
  UseDetailSheetOptions<unknown>,
  "id" | "onIdChange"
>

export interface UseListUrlStateResultat<
  K extends string,
  T extends string | undefined = undefined,
> {
  /** Rang du premier élément de la page (`offset`). */
  decalage: number
  /** Nombre d'éléments par page (`limit`). */
  limite: number
  tri: K
  sens: SensTri
  /** Valeur d'un filtre, `""` s'il est absent. */
  filtre: (cle: string) => string
  /** Nombre de filtres posés, recherche comprise (`filtresActifs` de
   *  `DataTableToolbar`). */
  filtresActifs: number
  /** Saisie du champ de recherche, recopiée dans l'URL (`?recherche=`)
   *  après une pause de frappe. */
  recherche: string
  saisirRecherche: (valeur: string) => void
  definirDecalage: (decalage: number) => void
  definirLimite: (limite: number) => void
  /** `null` : retour au tri par défaut. */
  definirTri: (tri: K | null, sens: SensTri) => void
  /** Pose un filtre ; une valeur vide le retire. */
  definirFiltre: (cle: string, valeur: string) => void
  /** Pose ou retire (`null`) un paramètre de vue ; garde la page. */
  definirVue: (cle: string, valeur: string | null) => void
  /** Retire les filtres et la recherche, garde la disposition et la vue. */
  reinitialiserFiltres: () => void
  /**
   * La page, à étaler dans `useServerPagination` avec la requête :
   * `useServerPagination({ ...liste.pagination, requete })`. Objet stable
   * tant que la page ne change pas.
   */
  pagination: ListUrlPagination
  /**
   * Les paramètres de l'URL sans la page (`offset`, `limit`) ni la vue
   * (tiroir compris) : filtres, recherche et tri, en texte. Change quand les
   * lignes retenues changent, pas quand on tourne la page ou ouvre un
   * élément : la clé d'une sélection de lignes ou d'une annonce à remettre à
   * zéro.
   */
  selection: string
  /**
   * Avec l'option `tiroir` : l'élément ouvert (`id`, `null` tiroir fermé) et
   * son setter, qui garde la page, à étaler dans `useDetailSheet`.
   * `undefined` sans l'option.
   */
  tiroir: T extends string ? ListUrlTiroir : undefined
}

/**
 * État d'une liste paginée gardé dans l'URL : page (`offset`), taille
 * (`limit`), tri (`tri`, `sens`), recherche (`recherche`) et filtres. Ouvrir
 * un élément puis revenir en arrière retrouve la liste telle qu'on l'a
 * laissée ; un lien ou un rechargement aussi. Seuls les écarts aux valeurs
 * par défaut sont écrits.
 *
 * Chaque réglage **remplace** l'entrée d'historique courante : le retour
 * arrière quitte la liste au lieu de défaire les filtres un à un. Tout
 * changement de filtre, de recherche, de tri ou de taille ramène en première
 * page (rester au décalage 50 d'un résultat de trois lignes afficherait une
 * page vide) ; la pagination et la vue la gardent.
 *
 * Indépendant du routeur : il lit `params` et écrit par `onParamsChange`.
 * Les fonctions rendues sont stables et partent de l'URL **demandée en
 * dernier**, pas de celle du dernier rendu : deux réglages dans le même
 * geste s'additionnent. `clesTri` et `limites` doivent être stables (des
 * constantes de module).
 *
 * ```tsx
 * const [params, setParams] = useSearchParams()
 * const liste = useListUrlState({
 *   params,
 *   onParamsChange: (p) => setParams(p, { replace: true }),
 *   clesTri: CLES_TRI, tri: "nom", sens: "asc",
 * })
 * const table = useDataTable({ …, ...useServerSorting(liste) })
 * const page = useServerPagination({ ...liste.pagination, requete })
 * <DataTableToolbar
 *   recherche={{ valeur: liste.recherche, onValeurChange: liste.saisirRecherche }}
 *   filtresActifs={liste.filtresActifs}
 *   onReinitialiser={liste.reinitialiserFiltres} … />
 * ```
 */
export function useListUrlState<
  K extends string,
  T extends string | undefined = undefined,
>({
  params,
  onParamsChange,
  clesTri,
  tri: triDefaut,
  sens: sensDefaut,
  limite: limiteDefaut = 25,
  limites = LIMITES_PAGINATION,
  vue = [],
  tiroir: cleTiroir,
}: UseListUrlStateOptions<K, T>): UseListUrlStateResultat<K, T> {
  // Clé de dépendance : `vue` est souvent écrite en ligne.
  const clesVue = (cleTiroir === undefined ? vue : [...vue, cleTiroir]).join(
    "\n"
  )

  const triLu = params.get("tri")
  const sensLu = params.get("sens")
  const tri = clesTri.includes(triLu as K) ? (triLu as K) : triDefaut
  const sens: SensTri =
    sensLu === "asc" || sensLu === "desc" ? sensLu : sensDefaut
  const limiteLue = Number(params.get("limit"))
  const limite = limites.includes(limiteLue) ? limiteLue : limiteDefaut
  const decalageLu = Math.trunc(Number(params.get("offset")))
  const decalage = Number.isFinite(decalageLu) ? Math.max(0, decalageLu) : 0

  // L'URL que le prochain réglage prolonge : celle du rendu, ou celle qu'un
  // réglage vient de demander et que le routeur n'a pas encore rendue.
  const courante = useRef(params)
  const ecrire = useRef(onParamsChange)
  useLayoutEffect(() => {
    courante.current = params
  }, [params])
  useLayoutEffect(() => {
    ecrire.current = onParamsChange
  })

  const modifier = useCallback(
    (transformer: (suivant: URLSearchParams) => void, garderPage = false) => {
      const suivant = new URLSearchParams(courante.current)
      transformer(suivant)
      if (!garderPage) suivant.delete("offset")
      if (suivant.toString() === courante.current.toString()) return
      courante.current = suivant
      ecrire.current(suivant)
    },
    []
  )

  const definirDecalage = useCallback(
    (valeur: number) =>
      modifier((suivant) => {
        if (valeur > 0) suivant.set("offset", String(valeur))
        else suivant.delete("offset")
      }, true),
    [modifier]
  )

  const definirLimite = useCallback(
    (valeur: number) =>
      modifier((suivant) => {
        if (valeur === limiteDefaut) suivant.delete("limit")
        else suivant.set("limit", String(valeur))
      }),
    [modifier, limiteDefaut]
  )

  const definirTri = useCallback(
    (cle: K | null, sensDemande: SensTri) =>
      modifier((suivant) => {
        if (cle === null || (cle === triDefaut && sensDemande === sensDefaut)) {
          suivant.delete("tri")
          suivant.delete("sens")
        } else {
          suivant.set("tri", cle)
          suivant.set("sens", sensDemande)
        }
      }),
    [modifier, triDefaut, sensDefaut]
  )

  const definirFiltre = useCallback(
    (cle: string, valeur: string) =>
      modifier((suivant) => {
        if (valeur === "") suivant.delete(cle)
        else suivant.set(cle, valeur)
      }),
    [modifier]
  )

  const definirVue = useCallback(
    (cle: string, valeur: string | null) =>
      modifier((suivant) => {
        if (valeur === null) suivant.delete(cle)
        else suivant.set(cle, valeur)
      }, true),
    [modifier]
  )

  const rechercher = useCallback(
    (valeur: string) => definirFiltre(RECHERCHE, valeur),
    [definirFiltre]
  )
  const [recherche, saisirRecherche] = useDebouncedSearch(
    params.get(RECHERCHE) ?? "",
    rechercher
  )

  const reinitialiserFiltres = useCallback(() => {
    saisirRecherche("")
    modifier((suivant) => {
      const gardees = clesVue.split("\n")
      for (const cle of [...suivant.keys()]) {
        if (!CLES_DISPOSITION.has(cle) && !gardees.includes(cle))
          suivant.delete(cle)
      }
    })
  }, [modifier, clesVue, saisirRecherche])

  const filtre = useCallback((cle: string) => params.get(cle) ?? "", [params])

  // La recherche compte dès la frappe, pas seulement une fois recopiée.
  const filtresActifs = useMemo(() => {
    const gardees = clesVue.split("\n")
    const cles = new Set(
      [...params.keys()].filter(
        (cle) =>
          cle !== RECHERCHE &&
          !CLES_DISPOSITION.has(cle) &&
          !gardees.includes(cle)
      )
    )
    return cles.size + (recherche.trim() ? 1 : 0)
  }, [params, clesVue, recherche])

  const pagination = useMemo(
    () => ({
      decalage,
      limite,
      limites,
      onDecalageChange: definirDecalage,
      onLimiteChange: definirLimite,
    }),
    [decalage, limite, limites, definirDecalage, definirLimite]
  )

  const selection = useMemo(() => {
    const retenue = new URLSearchParams(params)
    for (const cle of [...CLES_PAGE, ...clesVue.split("\n")])
      if (cle) retenue.delete(cle)
    return retenue.toString()
  }, [params, clesVue])

  const idTiroir = cleTiroir === undefined ? null : params.get(cleTiroir)
  const definirTiroir = useCallback(
    (valeur: string | null) => {
      if (cleTiroir !== undefined) definirVue(cleTiroir, valeur)
    },
    [definirVue, cleTiroir]
  )
  const tiroir = useMemo(
    () =>
      cleTiroir === undefined
        ? undefined
        : { id: idTiroir, onIdChange: definirTiroir },
    [cleTiroir, idTiroir, definirTiroir]
  ) as UseListUrlStateResultat<K, T>["tiroir"]

  return {
    decalage,
    limite,
    tri,
    sens,
    filtre,
    filtresActifs,
    recherche,
    saisirRecherche,
    definirDecalage,
    definirLimite,
    definirTri,
    definirFiltre,
    definirVue,
    reinitialiserFiltres,
    pagination,
    selection,
    tiroir,
  }
}

/**
 * Le `useSearchParams` d'un routeur : les paramètres de l'URL courante et
 * leur setter, qui accepte `{ replace: true }` (celui de react-router).
 */
export type UseSearchParamsRouteur = () => readonly [
  URLSearchParams,
  (params: URLSearchParams, options: { replace: true }) => void,
]

/** Les options de `useListUrlState` sans l'URL, que fournit le routeur. */
export type UseListUrlStateRouteurOptions<
  K extends string,
  T extends string | undefined = undefined,
> = Omit<UseListUrlStateOptions<K, T>, "params" | "onParamsChange">

/** Ce que rend `useListUrlState`, et les paramètres de l'URL lus. */
export type UseListUrlStateRouteurResultat<
  K extends string,
  T extends string | undefined = undefined,
> = UseListUrlStateResultat<K, T> & { params: URLSearchParams }

/**
 * `useListUrlState` branché une fois pour toutes sur le routeur de
 * l'application, sans que la bibliothèque en importe aucun : il lit l'URL
 * par `useSearchParams` et l'écrit sans nouvelle entrée d'historique. Le
 * hook rendu prend les mêmes options, moins `params` et `onParamsChange`, et
 * rend en plus `params`. L'appeler une fois, au niveau du module.
 *
 * ```tsx
 * import { useSearchParams } from "react-router-dom"
 * export const useListeUrl = creerEtatListeRouteur(useSearchParams)
 *
 * const liste = useListeUrl({ clesTri: CLES_TRI, tri: "nom", sens: "asc",
 *   tiroir: "document" })
 * ```
 */
export function creerEtatListeRouteur(useSearchParams: UseSearchParamsRouteur) {
  return function useListUrlStateRouteur<
    K extends string,
    T extends string | undefined = undefined,
  >(
    options: UseListUrlStateRouteurOptions<K, T>
  ): UseListUrlStateRouteurResultat<K, T> {
    const [params, setParams] = useSearchParams()
    const liste = useListUrlState<K, T>({
      ...options,
      params,
      onParamsChange: (suivants) => setParams(suivants, { replace: true }),
    })
    return { ...liste, params }
  }
}
