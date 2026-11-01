import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ComponentProps,
  type FocusEvent,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react"
import {
  columnFilteringFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  constructFilterFn,
  constructSortFn,
  createColumnHelper,
  createFilteredRowModel,
  createPaginatedRowModel,
  createSortedRowModel,
  filterFn_arrIncludes,
  filterFn_arrIncludesAll,
  filterFn_arrIncludesSome,
  filterFn_equals,
  filterFn_equalsString,
  filterFn_inDateRange,
  filterFn_inNumberRange,
  filterFn_includesString,
  filterFn_weakEquals,
  functionalUpdate,
  globalFilteringFeature,
  metaHelper,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortFn_alphanumeric,
  sortFn_basic,
  sortFn_datetime,
  sortFn_text,
  tableFeatures,
  useTable,
  type Column,
  type ColumnDef,
  type ColumnFiltersState,
  type ColumnOrderState,
  type ColumnVisibilityState,
  type ExpandedStateList,
  type OnChangeFn,
  type PaginationState,
  type ReactTable,
  type Row,
  type RowData,
  type RowSelectionState,
  type SortingState,
  type TableOptions,
} from "@tanstack/react-table"
import { cn } from "cn"
import {
  ArrowDownIcon,
  ArrowUpIcon,
  ChevronRightIcon,
  ChevronsUpDownIcon,
  MoreHorizontalIcon,
} from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import { Checkbox } from "@etic-ui/components/ui/checkbox"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@etic-ui/components/ui/dropdown-menu"
import { Skeleton } from "@etic-ui/components/ui/skeleton"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@etic-ui/components/ui/table"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import {
  UNITE_PAR_DEFAUT,
  nombreFr,
  participe,
  type DataTableUnite,
} from "@etic-ui/components/etic/data-table-format"
import { useLien, type LienComposant } from "@etic-ui/components/etic/lien"
import {
  focaliserTableau,
  rendreFocusApresLigne,
} from "@etic-ui/components/etic/data-table-focus"
import {
  QueryErrorBanner,
  type QueryBoundaryRequete,
} from "@etic-ui/components/etic/query-boundary"
import {
  comparerFr,
  normaliser,
  normaliserRecherche,
} from "@etic-ui/lib/normalize"

/** Métadonnées qu'une colonne peut porter (`meta` de sa définition). */
export interface DataTableColumnMeta {
  /** Nom de la colonne (sélecteur de colonnes, annonce du tri), quand son
   *  en-tête n'est pas un simple texte (`DataTableColumnHeader`…). */
  libelle?: string
  /** Classes ajoutées à l'en-tête et aux cellules (largeur, alignement…). */
  className?: string
}

/** État partagé que `useDataTable` transmet aux composants
 *  (`table.options.meta`). */
export interface DataTableMeta {
  total?: number
  toutSelectionne: boolean
  changerToutSelectionne: (toutSelectionne: boolean) => void
  /** Vide la sélection et met fin à « tous sélectionnés », en un seul appel
   *  à `onToutSelectionneChange`. */
  toutDeselectionner: () => void
  /** Retire ces lignes de la sélection (les autres restent cochées) et met
   *  fin à « tous sélectionnés ». */
  deselectionner: (ids: readonly string[]) => void
  /**
   * Cadre du tableau. `DataTable` le pose sur le sien ; un tableau rendu à
   * la main avec les primitives `Table` le pose sur son conteneur
   * (`ref={table.options.meta.racine}`). `DataTableBulkActions` y limite
   * Échap et y rend le focus quand la sélection est vidée.
   */
  racine: RefObject<HTMLDivElement | null>
  /** Identifiant du détail d'une ligne dépliée (cible d'`aria-controls`). */
  idDetail: (idLigne: string) => string
  /** Voir `colonnesReglables` de `useDataTable`. */
  colonnesReglables?: readonly string[]
}

/**
 * Textes normalisés des cellules, par tableau de données (`donnees`) et par
 * définitions de colonnes (un accesseur changé lit une autre valeur), puis
 * par ligne et colonne : une frappe dans la recherche ne renormalise pas
 * toute la liste. De nouvelles données ou de nouvelles colonnes repartent
 * d'un cache vide.
 */
const textesNormalises = new WeakMap<
  object,
  WeakMap<object, Map<string, string | undefined>>
>()

/** Ce que le filtre lit d'une ligne (sans le type de `dataTableFeatures`,
 *  qui dépend de ce filtre). */
interface LigneFiltree {
  id: string
  getValue: (colonne: string) => unknown
  table: { options: { data: unknown; columns: unknown } }
}

function cacheDe(row: LigneFiltree): Map<string, string | undefined> {
  const { data, columns } = row.table.options
  let parColonnes = textesNormalises.get(data as object)
  if (!parColonnes)
    textesNormalises.set(data as object, (parColonnes = new WeakMap()))
  let cache = parColonnes.get(columns as object)
  if (!cache) parColonnes.set(columns as object, (cache = new Map()))
  return cache
}

function texteNormaliseDe(
  row: LigneFiltree,
  colonne: string
): string | undefined {
  const cache = cacheDe(row)
  const cle = `${row.id}\u0000${colonne}`
  if (cache.has(cle)) return cache.get(cle)
  const valeur = row.getValue(colonne)
  const texte =
    valeur === null || valeur === undefined
      ? undefined
      : normaliser(String(valeur))
  cache.set(cle, texte)
  return texte
}

/** Filtre « contient », sans casse ni accents (« elo » trouve « Élodie ») :
 *  celui de la recherche (`filtreGlobal`), à donner aussi à une colonne
 *  (`filterFn: "texteFr"`). Une recherche vide ne filtre rien. */
const filterFn_texteFr = constructFilterFn({
  filter: (
    _valeur: unknown,
    cherche: string,
    row: LigneFiltree,
    colonne: string
  ): boolean =>
    // Recherche vide (après normalisation et rognage) : toute ligne passe,
    // même une cellule vide. TanStack retire d'ordinaire un tel filtre
    // (`autoRemove`), mais pas un filtre déjà résolu ni un appel direct.
    cherche === "" ||
    (texteNormaliseDe(row, colonne)?.includes(cherche) ?? false),
  autoRemove: (cherche: unknown) =>
    normaliserRecherche(String(cherche ?? "")) === "",
  resolveFilterValue: (cherche: unknown) =>
    normaliserRecherche(String(cherche ?? "")),
})

/** Tri alphabétique français (`comparerFr` : accents et casse ignorés,
 *  « Poste 2 » avant « Poste 10 ») : `sortFn: "texteFr"`. */
const sortFn_texteFr = constructSortFn({
  resolveDataValue: (valeur: unknown) =>
    valeur === null || valeur === undefined ? "" : String(valeur),
  sort: comparerFr,
})

/**
 * Fonctions de TanStack Table v9 dont se sert `DataTable` : tri, filtre et
 * pagination (côté client ; côté serveur avec `triManuel` et sans
 * `paginationClient`), visibilité et ordre des colonnes, sélection et
 * dépliage de lignes. Comme dans le guide Data Table de shadcn, les colonnes
 * se déclarent avec ce registre : `createDataTableColumnHelper<T>()`.
 *
 * Tris nommés (`sortFn`) : ceux de TanStack et `texteFr` (ordre
 * alphabétique français). Filtres nommés (`filterFn`) : ceux de TanStack et
 * `texteFr` (« contient », sans casse ni accents).
 */
export const dataTableFeatures = tableFeatures({
  columnFilteringFeature,
  columnOrderingFeature,
  columnVisibilityFeature,
  globalFilteringFeature,
  rowExpandingFeature,
  rowPaginationFeature,
  rowSelectionFeature,
  rowSortingFeature,
  filteredRowModel: createFilteredRowModel(),
  paginatedRowModel: createPaginatedRowModel(),
  sortedRowModel: createSortedRowModel(),
  filterFns: {
    arrIncludes: filterFn_arrIncludes,
    arrIncludesAll: filterFn_arrIncludesAll,
    arrIncludesSome: filterFn_arrIncludesSome,
    equals: filterFn_equals,
    equalsString: filterFn_equalsString,
    inDateRange: filterFn_inDateRange,
    inNumberRange: filterFn_inNumberRange,
    includesString: filterFn_includesString,
    texteFr: filterFn_texteFr,
    weakEquals: filterFn_weakEquals,
  },
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
    texteFr: sortFn_texteFr,
  },
  columnMeta: metaHelper<DataTableColumnMeta>(),
  tableMeta: metaHelper<DataTableMeta>(),
})

export type DataTableFeatures = typeof dataTableFeatures

/** Définition d'une colonne de `DataTable`. */
export type DataTableColumnDef<TData extends RowData> = ColumnDef<
  DataTableFeatures,
  TData
>

/** Instance renvoyée par `useDataTable`, passée aux composants `DataTable*`. */
export type DataTableInstance<TData extends RowData> = ReactTable<
  DataTableFeatures,
  TData
>

/** Assistant de colonnes typé pour `DataTable` : `accessor`, `display`… */
export function createDataTableColumnHelper<TData extends RowData>() {
  return createColumnHelper<DataTableFeatures, TData>()
}

type Colonne<TData extends RowData> = Column<DataTableFeatures, TData, unknown>

/** Nom d'une colonne : `meta.libelle`, sinon son en-tête s'il est un texte,
 *  sinon son identifiant. */
export function libelleColonne<TData extends RowData>(
  colonne: Colonne<TData>
): string {
  const { meta, header } = colonne.columnDef
  if (meta?.libelle) return meta.libelle
  return typeof header === "string" ? header : colonne.id
}

/**
 * L'état partagé d'un tableau de `useDataTable`, toujours posé par lui.
 * Lève pour une instance créée autrement : les composants `DataTable*` en
 * dépendent.
 */
export function metaDe<TData extends RowData>(
  table: DataTableInstance<TData>
): DataTableMeta {
  const meta = table.options.meta
  if (!meta)
    throw new Error(
      "DataTable : instance sans `meta`. Créez-la avec `useDataTable`."
    )
  return meta
}

/**
 * La pagination d'un tableau, lue au même endroit pour `DataTablePagination`
 * et `DataTableCount` : lignes après filtre (`getRowCount`), page courante.
 * `manuelle` : le tableau ne découpe rien (sans
 * `paginationClient`), ses pages ne se pilotent pas depuis la table.
 */
export function paginationDuTableau<TData extends RowData>(
  table: DataTableInstance<TData>
) {
  const { pageIndex, pageSize } = table.state.pagination
  return {
    manuelle: !!table.options.manualPagination,
    total: table.getRowCount(),
    decalage: table.options.manualPagination ? 0 : pageIndex * pageSize,
    limite: pageSize,
    nombre: table.getRowModel().rows.length,
  }
}

/** La phrase de « tous sélectionnés » : « Les 137 éléments sont
 *  sélectionnés. » (zone annoncée et bandeau). */
function phraseToutSelectionne(
  total: number,
  unite: DataTableUnite,
  feminin: boolean
): string {
  return `Les ${nombreFr(total)} ${unite.pluriel} sont ${participe("sélectionné", 2, feminin)}.`
}

/**
 * Valeur contrôlée par l'application (`valeur` fournie) ou interne, avec un
 * seul point de changement : il ne signale qu'une valeur différente, met à
 * jour l'état interne s'il n'est pas contrôlé et prévient `onChange`.
 */
function useControlable<T>(
  valeur: T | undefined,
  onChange: ((valeur: T) => void) | undefined,
  initial: T
): [T, (suivante: T) => void] {
  const [interne, setInterne] = useState(initial)
  const courante = valeur === undefined ? interne : valeur
  const changer = (suivante: T) => {
    if (Object.is(suivante, courante)) return
    if (valeur === undefined) setInterne(suivante)
    onChange?.(suivante)
  }
  return [courante, changer]
}

export interface UseDataTableOptions<TData extends RowData> {
  /** Lignes affichées. Référence stable (état, mémo, résultat de requête) :
   *  un nouveau tableau à chaque rendu recalcule tout le tableau. */
  donnees: TData[]
  /** Colonnes, déclarées hors du composant ou mémorisées. */
  colonnes: DataTableColumnDef<TData>[]
  /** Identifiant d'une ligne : la sélection et le dépliage s'y rattachent.
   *  Lu quand `donnees` change ; il peut être écrit en ligne. */
  idLigne: (ligne: TData, index: number) => string

  /** Tri contrôlé ; sans lui, le tableau garde son propre état. */
  tri?: SortingState
  onTriChange?: OnChangeFn<SortingState>
  /** Les données arrivent déjà triées (tri côté serveur) : le tableau ne
   *  réordonne rien, il signale seulement le tri demandé. */
  triManuel?: boolean

  /**
   * Pagination côté client : `donnees` contient toute la liste, le tableau
   * n'en affiche qu'une page (25 lignes par défaut), après le filtre et le
   * tri. `DataTablePagination table={table}` la pilote, et `DataTableCount
   * table={table}` la compte. Sans elle, le tableau affiche toutes les
   * lignes reçues (pagination côté serveur, ou pas de pagination).
   */
  paginationClient?: boolean
  /** Page et taille contrôlées (`{ pageIndex, pageSize }`), avec
   *  `paginationClient`. */
  pagination?: PaginationState
  onPaginationChange?: OnChangeFn<PaginationState>

  /**
   * Filtres par colonne, appliqués par le tableau (`{ id, value }` ; la
   * colonne choisit sa fonction : `filterFn: "equals"`, `"texteFr"`…).
   * Contrôlés avec `onFiltresColonnesChange`, internes sinon
   * (`table.getColumn(id)?.setFilterValue(valeur)`). Un changement de filtre
   * ou de tri ramène à la première page.
   */
  filtresColonnes?: ColumnFiltersState
  onFiltresColonnesChange?: OnChangeFn<ColumnFiltersState>
  /** Recherche sur toutes les colonnes à accesseur, sans casse ni accents
   *  (`texteFr`). Contrôlée avec `onFiltreGlobalChange`, interne sinon
   *  (`table.setGlobalFilter`). */
  filtreGlobal?: string
  onFiltreGlobalChange?: OnChangeFn<string>

  visibiliteColonnes?: ColumnVisibilityState
  onVisibiliteColonnesChange?: OnChangeFn<ColumnVisibilityState>
  /** Identifiants des colonnes dans l'ordre d'affichage. */
  ordreColonnes?: ColumnOrderState
  onOrdreColonnesChange?: OnChangeFn<ColumnOrderState>
  /** Colonnes que « Colonnes » (`DataTableViewOptions`) peut masquer et
   *  déplacer ; les autres y restent fixes, à leur place. Toutes les
   *  masquables par défaut. Donné par `useColumnPrefs`. */
  colonnesReglables?: readonly string[]

  /** Sélection contrôlée : `{ [idLigne]: true }`. */
  selection?: RowSelectionState
  onSelectionChange?: OnChangeFn<RowSelectionState>
  /** Une ligne peut-elle être sélectionnée ? Toutes, par défaut. Référence
   *  stable de préférence : elle est relue à chaque changement. */
  ligneSelectionnable?: (ligne: TData) => boolean
  /**
   * Par défaut, la sélection ne garde que des lignes affichées : changer de
   * page, de filtre (côté serveur ou côté client) ou supprimer des lignes la
   * réduit à ce qui est à l'écran. `true` la conserve d'une page à l'autre.
   */
  conserverSelection?: boolean

  /**
   * Nombre total d'éléments, toutes pages comprises (pagination côté
   * serveur). Fourni, il permet de sélectionner tous les éléments et pas
   * seulement ceux de la page : quand la page est entièrement cochée,
   * `DataTable` propose « Sélectionner les N éléments ». Avec
   * `ligneSelectionnable`, il ne compte que les éléments sélectionnables
   * (le tableau ne connaît pas ceux des autres pages) : c'est le nombre
   * annoncé et visé par l'action groupée.
   */
  total?: number
  /**
   * Tous les éléments (`total`) sont sélectionnés, y compris ceux hors de la
   * page, dont le tableau ne connaît pas les identifiants : l'application
   * l'interprète (envoyer ses filtres au lieu d'identifiants…). Contrôlé avec
   * `onToutSelectionneChange`, interne sinon. Repasse à `false` quand une
   * ligne de la page n'est plus cochée (par le tableau ou par l'application),
   * quand la page change (même avec `conserverSelection`) et par « Tout
   * désélectionner » ; l'application le remet aussi à `false` quand ses
   * filtres ou le tri changent.
   */
  toutSelectionne?: boolean
  onToutSelectionneChange?: (toutSelectionne: boolean) => void

  /** Lignes dépliées, contrôlées : `{ [idLigne]: true }`. Sans elles, le
   *  tableau garde son propre état. */
  lignesDepliees?: ExpandedStateList
  onLignesDeplieesChange?: OnChangeFn<ExpandedStateList>
  /** Une ligne peut-elle se déplier ? Toutes, par défaut (avec
   *  `rendreDetail` sur `DataTable`). */
  ligneDepliable?: (ligne: TData) => boolean
  /** Déplier une ligne replie l'autre : une seule ouverte à la fois. */
  uneSeuleLigneDepliee?: boolean

  /** État de départ des parties non contrôlées. */
  etatInitial?: {
    tri?: SortingState
    visibiliteColonnes?: ColumnVisibilityState
    ordreColonnes?: ColumnOrderState
    lignesDepliees?: ExpandedStateList
    /** Taille de page (et page) de départ de `paginationClient`. */
    pagination?: Partial<PaginationState>
    filtresColonnes?: ColumnFiltersState
    filtreGlobal?: string
  }
}

/** Lignes par page de `paginationClient` sans réglage : la valeur courante
 *  des listes ETIC (et un choix de `DataTablePagination`). */
const TAILLE_PAGE_CLIENT = 25

/** Réduit un état `{ [id]: booléen }` aux identifiants gardés, chacun avec
 *  sa valeur d'origine (une entrée `false` reste `false`) ; même objet quand
 *  rien ne part (ni rendu ni `on…Change`). */
function restreindre<T extends Record<string, boolean>>(
  avant: T,
  garder: (id: string) => boolean
): T {
  const gardes = Object.entries(avant).filter(([id]) => garder(id))
  if (gardes.length === Object.keys(avant).length) return avant
  return Object.fromEntries(gardes) as T
}

/**
 * Crée l'instance TanStack Table (v9, `useTable`) d'un `DataTable`. Chaque
 * partie de l'état (tri, colonnes, sélection, dépliage) est contrôlée si sa
 * valeur est fournie avec son `on…Change`, interne sinon.
 */
export function useDataTable<TData extends RowData>({
  donnees,
  colonnes,
  idLigne,
  tri,
  onTriChange,
  triManuel,
  paginationClient = false,
  pagination,
  onPaginationChange,
  filtresColonnes,
  onFiltresColonnesChange,
  filtreGlobal,
  onFiltreGlobalChange,
  visibiliteColonnes,
  onVisibiliteColonnesChange,
  ordreColonnes,
  onOrdreColonnesChange,
  colonnesReglables,
  selection,
  onSelectionChange,
  ligneSelectionnable,
  conserverSelection = false,
  total,
  toutSelectionne,
  onToutSelectionneChange,
  lignesDepliees,
  onLignesDeplieesChange,
  ligneDepliable,
  uneSeuleLigneDepliee = false,
  etatInitial,
}: UseDataTableOptions<TData>): DataTableInstance<TData> {
  const [tout, changerTout] = useControlable(
    toutSelectionne,
    onToutSelectionneChange,
    false
  )
  const racine = useRef<HTMLDivElement>(null)
  const prefixe = useId()

  // Une option passée à `undefined` remplacerait le gestionnaire interne de
  // TanStack : seules les parties contrôlées figurent dans les options.
  const state: TableOptions<DataTableFeatures, TData>["state"] = {}
  const controle: Partial<TableOptions<DataTableFeatures, TData>> = {}
  if (tri !== undefined) state.sorting = tri
  if (onTriChange) controle.onSortingChange = onTriChange
  if (visibiliteColonnes !== undefined)
    state.columnVisibility = visibiliteColonnes
  if (onVisibiliteColonnesChange)
    controle.onColumnVisibilityChange = onVisibiliteColonnesChange
  if (ordreColonnes !== undefined) state.columnOrder = ordreColonnes
  if (onOrdreColonnesChange)
    controle.onColumnOrderChange = onOrdreColonnesChange
  if (pagination !== undefined) state.pagination = pagination
  if (onPaginationChange) controle.onPaginationChange = onPaginationChange
  if (filtresColonnes !== undefined) state.columnFilters = filtresColonnes
  if (onFiltresColonnesChange)
    controle.onColumnFiltersChange = onFiltresColonnesChange
  if (filtreGlobal !== undefined) state.globalFilter = filtreGlobal
  if (onFiltreGlobalChange) controle.onGlobalFilterChange = onFiltreGlobalChange

  // Même objet : rien n'a changé, rien n'est signalé (`useControlable`).
  const [selectionCourante, changerSelection] =
    useControlable<RowSelectionState>(selection, onSelectionChange, {})
  state.rowSelection = selectionCourante
  controle.onRowSelectionChange = (maj) =>
    changerSelection(functionalUpdate(maj, selectionCourante))

  const [deplieesCourantes, changerDepliees] =
    useControlable<ExpandedStateList>(
      lignesDepliees,
      onLignesDeplieesChange,
      etatInitial?.lignesDepliees ?? {}
    )
  state.expanded = deplieesCourantes
  controle.onExpandedChange = (maj) => {
    const brute = functionalUpdate(maj, deplieesCourantes)
    // `true` (tout déplier) devient la liste des lignes dépliables.
    let suivante: ExpandedStateList =
      brute === true
        ? Object.fromEntries(
            table
              .getCoreRowModel()
              .rows.filter((row) => row.getCanExpand())
              .map((row) => [row.id, true])
          )
        : brute
    if (uneSeuleLigneDepliee) {
      const ajoutee = Object.keys(suivante)
        .filter((id) => suivante[id] && !deplieesCourantes[id])
        .at(-1)
      if (ajoutee) suivante = { [ajoutee]: true }
    }
    changerDepliees(suivante)
  }

  const table: DataTableInstance<TData> = useTable({
    features: dataTableFeatures,
    data: donnees,
    columns: colonnes,
    getRowId: idLigne,
    manualSorting: triManuel,
    // Sans `paginationClient`, les lignes reçues sont la page : rien à
    // découper.
    manualPagination: !paginationClient,
    // TanStack reviendrait aussi à la première page quand les données
    // changent : supprimer une ligne de la page 3 ramènerait en page 1. Le
    // retour se fait seulement au changement de filtre ou de tri (plus bas).
    autoResetPageIndex: false,
    globalFilterFn: "texteFr",
    enableMultiSort: false,
    enableRowSelection: ligneSelectionnable
      ? (row) => ligneSelectionnable(row.original)
      : true,
    getRowCanExpand: ligneDepliable
      ? (row) => ligneDepliable(row.original)
      : () => true,
    // Une requête rechargée ne referme pas le détail ouvert : seules les
    // lignes disparues sont retirées (plus bas).
    autoResetExpanded: false,
    initialState: {
      sorting: etatInitial?.tri ?? [],
      columnVisibility: etatInitial?.visibiliteColonnes ?? {},
      columnOrder: etatInitial?.ordreColonnes ?? [],
      pagination: {
        pageIndex: 0,
        pageSize: TAILLE_PAGE_CLIENT,
        ...etatInitial?.pagination,
      },
      columnFilters: etatInitial?.filtresColonnes ?? [],
      globalFilter: etatInitial?.filtreGlobal ?? "",
    },
    state,
    ...controle,
    meta: {
      total,
      // Affiché seulement si la page est bien cochée, y compris au rendu qui
      // précède la remise à `false` ci-dessous.
      // (getter : lu après la création de `table`, dont il interroge les lignes).
      get toutSelectionne(): boolean {
        return tout && pageCochee
      },
      changerToutSelectionne: (valeur) => {
        if (valeur) table.toggleAllPageRowsSelected(true)
        changerTout(valeur)
      },
      toutDeselectionner: () => {
        table.resetRowSelection(true)
        changerTout(false)
      },
      deselectionner: (ids) => {
        const retires = new Set(ids)
        table.setRowSelection((avant) =>
          restreindre(avant, (id) => !retires.has(id))
        )
        changerTout(false)
      },
      racine,
      idDetail: (id) => `${prefixe}detail-${encodeURIComponent(id)}`,
      colonnesReglables,
    },
  })

  // Les identifiants viennent des modèles de lignes de TanStack, mémorisés
  // sur `donnees` (et le filtre, le tri, la page) : `idLigne` n'est pas
  // rappelé à chaque rendu. Les lignes de la page sont celles affichées ;
  // celles des données, toutes les lignes reçues.
  const lignesDonnees = table.getCoreRowModel().rows
  const lignesPage = table.getRowModel().rows
  // Page entièrement cochée (lignes sélectionnables, au moins une) : la
  // règle de TanStack, calculée une fois par rendu et lue par le getter
  // `toutSelectionne` ci-dessus (appelé après ce rendu).
  const pageCochee = table.getIsAllPageRowsSelected()

  // « Tous sélectionnés » ne vaut que pour la page où l'utilisateur l'a
  // demandé, entièrement cochée : il retombe quand la page change (même si
  // `conserverSelection` y garde des lignes cochées) et dès qu'une ligne de
  // la page n'est plus cochée, que ce soit par le tableau ou par
  // l'application (sélection contrôlée remplacée). Le contenu de la page est
  // comparé sans son ordre (trier ne la change pas), et seulement quand ses
  // lignes changent.
  const clePagePrecedente = useRef<string | null>(null)
  const finTout = useEffectEvent(() => changerTout(false))
  useEffect(() => {
    const clePage = lignesPage
      .map((row) => row.id)
      .sort()
      .join("\u0000")
    const pageChangee =
      clePagePrecedente.current !== null &&
      clePagePrecedente.current !== clePage
    clePagePrecedente.current = clePage
    if (tout && (pageChangee || !pageCochee)) finTout()
  }, [lignesPage, pageCochee, tout])

  // La sélection se limite aux lignes affichées (page et filtre compris) ;
  // le dépliage, aux lignes des données (un détail masqué par un filtre
  // reste ouvert quand la ligne revient).
  // Avant l'affichage (`useLayoutEffect`), pour ne pas peindre une ligne
  // cochée ou dépliée qui n'est plus là. Rien à faire, ni `Set` à bâtir, tant
  // que la sélection (ou le dépliage) est vide.
  const restreindreSelection = useEffectEvent(() => {
    if (conserverSelection || Object.keys(selectionCourante).length === 0)
      return
    const affichees = new Set(lignesPage.map((row) => row.id))
    table.setRowSelection((avant) =>
      restreindre(avant, (id) => affichees.has(id))
    )
  })
  useLayoutEffect(() => {
    restreindreSelection()
  }, [lignesPage])
  // Le dépliage se limite aux lignes des données (un détail masqué par un
  // filtre reste ouvert quand la ligne revient) : `rowsById` du modèle de
  // base, sans `Set`.
  const restreindreDepliees = useEffectEvent(() => {
    if (Object.keys(deplieesCourantes).length === 0) return
    const { rowsById } = table.getCoreRowModel()
    table.setExpanded((avant) =>
      avant === true ? avant : restreindre(avant, (id) => id in rowsById)
    )
  })
  useLayoutEffect(() => {
    restreindreDepliees()
  }, [lignesDonnees])

  // Un filtre ou un tri changé ramène à la première page (pagination côté
  // client) : la page 4 d'une recherche qui n'en a plus qu'une serait vide.
  // L'effet ne s'exécute que si une référence change ; le contenu est alors
  // comparé (un `filtresColonnes` recréé à l'identique ne change rien).
  const { columnFilters, globalFilter, sorting, pagination: page } = table.state
  const criteres = useRef<string | null>(null)
  const premierePage = useEffectEvent(() => {
    if (paginationClient && table.state.pagination.pageIndex !== 0)
      table.setPageIndex(0)
  })
  useLayoutEffect(() => {
    const suivants = JSON.stringify([columnFilters, globalFilter, sorting])
    const precedents = criteres.current
    criteres.current = suivants
    if (precedents !== null && precedents !== suivants) premierePage()
  }, [columnFilters, globalFilter, sorting])

  // Page au-delà de la fin (dernières lignes supprimées) : la dernière page
  // existante, plutôt qu'une page vide sous un numéro surligné. Seul endroit
  // qui le fait pour une pagination côté client, que `DataTablePagination`
  // soit affichée ou non. Pas tant qu'il n'y a aucune ligne : c'est souvent
  // une liste pas encore chargée, et une page venue de l'URL ou de
  // `etatInitial` serait ramenée à la première.
  const nombrePages = table.getPageCount()
  const nombreLignes = table.getRowCount()
  const ramener = useEffectEvent(() =>
    table.setPageIndex(Math.max(0, nombrePages - 1))
  )
  useLayoutEffect(() => {
    if (
      paginationClient &&
      nombreLignes > 0 &&
      page.pageIndex > 0 &&
      page.pageIndex >= nombrePages
    )
      ramener()
  }, [paginationClient, nombreLignes, page.pageIndex, nombrePages])

  return table
}

/** Éléments interactifs ou focalisables : un clic dessus leur revient. */
const INTERACTIF = [
  "a[href]",
  "button",
  "input",
  "select",
  "textarea",
  "label",
  "summary",
  "[contenteditable]:not([contenteditable=false])",
  "[tabindex]",
  ...[
    "button",
    "link",
    "checkbox",
    "radio",
    "switch",
    "combobox",
    "listbox",
    "option",
    "tab",
    "slider",
    "spinbutton",
    "textbox",
    "searchbox",
    "menuitem",
    "menuitemcheckbox",
    "menuitemradio",
  ].map((role) => `[role=${role}]`),
].join(", ")

/** Clic sur une ligne qui doit l'ouvrir : ni sur un élément interactif ou
 *  focalisable de la ligne (bouton, lien, case, champ…), ni dans un menu
 *  ouvert depuis la ligne, ni pendant une sélection de texte (copier une
 *  adresse reste facile). */
function estActivation(event: MouseEvent<HTMLElement>): boolean {
  const ligne = event.currentTarget
  const cible = event.target as Element
  // Les événements React remontent aussi depuis un portail (menu d'actions).
  if (!ligne.contains(cible)) return false
  // Seul compte ce qui se trouve entre la cible et la ligne : le tableau
  // peut lui-même être dans un conteneur focalisable.
  const interactif = cible.closest(INTERACTIF)
  if (interactif && interactif !== ligne && ligne.contains(interactif))
    return false
  return !window.getSelection()?.toString()
}

/** Ce que `DataTable` lit de la requête de ses lignes : le résultat de
 *  `useQuery` de TanStack Query convient tel quel. */
export type DataTableRequete = Pick<
  QueryBoundaryRequete<unknown>,
  "isError" | "error" | "isFetching" | "refetch"
>

export interface DataTableProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Nom du tableau pour les lecteurs d'écran : « Membres ». */
  libelle: string
  /**
   * La requête des lignes. En échec, un bandeau d'erreur avec « Réessayer »
   * s'affiche au-dessus du tableau (rendu dans le parent, qui règle
   * l'espacement, comme `QueryBoundary`) et l'état vide se tait : il
   * contredirait le bandeau. Sans `enChargement`, `isFetching` en tient
   * lieu.
   */
  requete?: DataTableRequete
  /** Données en cours de chargement : lignes fantômes s'il n'y a encore
   *  rien, lignes actuelles atténuées sinon. */
  enChargement?: boolean
  /** Nombre de lignes fantômes : la taille de la page, pour que la hauteur
   *  ne saute pas. 10 par défaut. */
  lignesChargement?: number
  /** Contenu affiché quand il n'y a aucune ligne : un texte, ou un bloc
   *  avec une action (« Réinitialiser les filtres »). */
  vide?: ReactNode
  /**
   * Clic sur une ligne (ouvrir sa fiche…). Les clics sur une commande de la
   * ligne restent à la commande. La souris seulement : une cellule doit
   * aussi offrir un lien ou un bouton pour le clavier.
   */
  onActiverLigne?: (ligne: TData) => void
  /**
   * Détail d'une ligne dépliée, rendu sous elle sur toute la largeur. Le
   * bouton qui déplie vient de `dataTableExpandColumn` (clavier compris) ;
   * sans `onActiverLigne`, un clic sur la ligne la déplie aussi.
   */
  rendreDetail?: (ligne: TData) => ReactNode
  /** Nom des éléments dans la proposition « Sélectionner les N éléments ».
   *  « élément », « éléments » par défaut. */
  unite?: DataTableUnite
  /** Accorde « sélectionnées » au féminin. */
  feminin?: boolean
  className?: string
}

/**
 * Tableau de données : la Table de shadcn rendue par TanStack Table v9, comme
 * dans le guide Data Table de shadcn. Le tableau garde toutes ses colonnes sur
 * mobile : c'est son cadre qui défile horizontalement.
 *
 * Une ligne ne se re-rend que si ses données, sa sélection, son dépliage ou
 * les colonnes changent : cocher une case ne redessine pas tout le tableau.
 * Une cellule qui affiche un autre état le lit elle-même (hook, contexte).
 */
export function DataTable<TData extends RowData>({
  table,
  libelle,
  requete,
  enChargement = requete?.isFetching ?? false,
  lignesChargement = 10,
  vide: videDemande = "Aucun résultat.",
  onActiverLigne,
  rendreDetail,
  unite = UNITE_PAR_DEFAUT,
  feminin = false,
  className,
}: DataTableProps<TData>) {
  const enErreur = requete?.isError ?? false
  const vide = enErreur ? null : videDemande
  const lignes = table.getRowModel().rows
  const colonnesVisibles = table.getVisibleLeafColumns()
  const cleColonnes = colonnesVisibles.map((colonne) => colonne.id).join(" ")
  const meta = metaDe(table)
  const { racine } = meta

  // Gestionnaire de clic stable : une fonction écrite en ligne par
  // l'application ne doit pas redessiner chaque ligne.
  const activerRef = useRef<
    ((row: Row<DataTableFeatures, TData>) => void) | null
  >(null)
  useLayoutEffect(() => {
    activerRef.current = onActiverLigne
      ? (row) => onActiverLigne(row.original)
      : rendreDetail
        ? (row) => row.toggleExpanded()
        : null
  })
  const activer = useCallback(
    (row: Row<DataTableFeatures, TData>) => activerRef.current?.(row),
    []
  )

  // Le détail et l'état vide suivent la largeur visible du cadre, pas celle
  // du tableau : sur mobile, ils restent lisibles (et centrés) pendant que
  // les colonnes défilent. La variable CSS est écrite directement, sans
  // rendu React. (Une requête de conteneur ne suffit pas : `cqw` sur le
  // cadre défilant mesurerait la largeur défilable, pas la partie visible.)
  useEffect(() => {
    const cadre = racine.current
    const defilant = cadre?.querySelector<HTMLElement>(
      '[data-slot="table-container"]'
    )
    if (!cadre || !defilant || typeof ResizeObserver === "undefined") return
    const observateur = new ResizeObserver(() =>
      cadre.style.setProperty(
        "--data-table-largeur",
        `${defilant.clientWidth}px`
      )
    )
    observateur.observe(defilant)
    return () => observateur.disconnect()
  }, [racine])

  useLargeursStables(racine, lignes.length > 0, cleColonnes)

  const annonce = useAnnonce(table, enChargement && lignes.length === 0, {
    unite,
    feminin,
  })

  // Deux places fixes, comme `QueryBoundary` : le bandeau absent garde la
  // sienne, et le tableau n'est pas remonté quand il apparaît.
  return (
    <>
      {requete ? <QueryErrorBanner requete={requete} /> : null}
      <div
        ref={racine}
        data-slot="data-table"
        className={cn("min-w-0 overflow-hidden rounded-md border", className)}
      >
        {/* Toujours montée : une zone insérée avec son texte n'est pas lue de
          façon fiable. */}
        <p className="sr-only" aria-live="polite" aria-atomic="true">
          {annonce}
        </p>
        <PropositionToutSelectionner
          table={table}
          unite={unite}
          feminin={feminin}
        />
        <Table aria-label={libelle} aria-busy={enChargement || undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((groupe) => (
              <TableRow key={groupe.id}>
                {groupe.headers.map((header) => (
                  <TableHead
                    key={header.id}
                    colSpan={header.colSpan}
                    aria-sort={triAria(header.column)}
                    className={header.column.columnDef.meta?.className}
                  >
                    {header.isPlaceholder ? null : (
                      <table.FlexRender header={header} />
                    )}
                  </TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody
            className={cn(
              enChargement &&
                lignes.length > 0 &&
                "opacity-60 transition-opacity"
            )}
          >
            {lignes.length ? (
              lignes.map((row) => (
                <LigneTableau
                  key={row.id}
                  row={row}
                  selectionnee={row.getIsSelected()}
                  selectionnable={row.getCanSelect()}
                  depliee={row.getIsExpanded()}
                  depliable={row.getCanExpand()}
                  cleColonnes={cleColonnes}
                  colonnes={table.options.columns}
                  cliquable={
                    onActiverLigne !== undefined ||
                    (rendreDetail !== undefined && row.getCanExpand())
                  }
                  activer={activer}
                  rendreDetail={rendreDetail}
                />
              ))
            ) : enChargement ? (
              // Lignes fantômes muettes : la zone annoncée dit « Chargement… ».
              Array.from({ length: lignesChargement }, (_, i) => (
                <TableRow key={i} data-slot="data-table-skeleton" aria-hidden>
                  {colonnesVisibles.map((colonne) => (
                    <TableCell key={colonne.id}>
                      <Skeleton className="h-4 w-full max-w-32" />
                    </TableCell>
                  ))}
                </TableRow>
              ))
            ) : (
              <TableRow className="hover:bg-transparent">
                <TableCell
                  colSpan={colonnesVisibles.length || 1}
                  className="h-24 p-0 text-center whitespace-normal text-muted-foreground"
                >
                  {/* Centré sur la partie visible du cadre, pas sur la largeur
                    défilable. */}
                  <div className="sticky left-0 w-[var(--data-table-largeur,100%)] p-2">
                    {vide}
                  </div>
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </>
  )
}

/**
 * Largeurs des colonnes gardées quand le tableau se vide (filtre sans
 * résultat, chargement de la page suivante) : en mise en page automatique,
 * elles ne dépendraient plus que des en-têtes, et les colonnes sauteraient.
 * Mesurées tant qu'il y a des lignes, posées sur les en-têtes sinon.
 */
function useLargeursStables(
  racine: RefObject<HTMLDivElement | null>,
  avecLignes: boolean,
  cleColonnes: string
) {
  // Dernières largeurs vues avec des lignes, par en-tête : un
  // `ResizeObserver` les relève quand elles changent (après la mise en page,
  // sans la forcer), au lieu d'une mesure à chaque nouvelle page.
  const largeurs = useRef(new WeakMap<Element, number>())
  const avecLignesRef = useRef(avecLignes)
  const posees = useRef(false)

  const entetes = () =>
    racine.current?.querySelectorAll<HTMLElement>(
      '[data-slot="table-header"] [data-slot="table-head"]'
    ) ?? []

  // Observation par jeu de colonnes : de nouveaux en-têtes à suivre.
  useLayoutEffect(() => {
    if (typeof ResizeObserver === "undefined") return
    const observateur = new ResizeObserver((entrees) => {
      // Pendant le vide, les largeurs relevées sont celles qu'on a posées.
      if (!avecLignesRef.current) return
      for (const { target, borderBoxSize, contentRect } of entrees)
        largeurs.current.set(
          target,
          borderBoxSize?.[0]?.inlineSize ?? contentRect.width
        )
    })
    for (const th of entetes()) observateur.observe(th)
    return () => observateur.disconnect()
    // `entetes` lit le DOM du rendu courant : seules les colonnes comptent.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [racine, cleColonnes])

  useLayoutEffect(() => {
    avecLignesRef.current = avecLignes
    // Lignes revenues, ou colonnes changées : mise en page automatique, si
    // on l'avait figée.
    if (posees.current) {
      for (const th of entetes()) th.style.removeProperty("width")
      posees.current = false
    }
    if (avecLignes) return
    for (const th of entetes()) {
      const largeur = largeurs.current.get(th)
      if (largeur) {
        th.style.width = `${largeur}px`
        posees.current = true
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [avecLignes, cleColonnes])
}

/**
 * Texte de la zone annoncée du tableau : chargement, tri choisi, tous les
 * éléments sélectionnés. Un tri n'est annoncé qu'après un changement, pas
 * au premier rendu.
 */
function useAnnonce<TData extends RowData>(
  table: DataTableInstance<TData>,
  chargementInitial: boolean,
  { unite, feminin }: { unite: DataTableUnite; feminin: boolean }
): string {
  const [critere] = table.state.sorting ?? []
  const colonneTriee = critere ? table.getColumn(critere.id) : undefined
  const messageTri = colonneTriee
    ? `Trié par ${libelleColonne(colonneTriee)}, ordre ${critere.desc ? "décroissant" : "croissant"}.`
    : ""
  const [triPrecedent, setTriPrecedent] = useState(messageTri)
  const [annonceTri, setAnnonceTri] = useState("")
  if (messageTri !== triPrecedent) {
    setTriPrecedent(messageTri)
    setAnnonceTri(messageTri)
  }

  const meta = metaDe(table)
  if (chargementInitial) return "Chargement…"
  if (meta.toutSelectionne && meta.total !== undefined)
    return phraseToutSelectionne(meta.total, unite, feminin)
  return annonceTri
}

interface LigneTableauProps<TData extends RowData> {
  row: Row<DataTableFeatures, TData>
  selectionnee: boolean
  selectionnable: boolean
  depliee: boolean
  depliable: boolean
  cleColonnes: string
  colonnes: unknown
  cliquable: boolean
  activer: (row: Row<DataTableFeatures, TData>) => void
  rendreDetail?: (ligne: TData) => ReactNode
}

/**
 * Suit le focus d'une ligne pour le rendre quand elle disparaît (suppression,
 * liste rechargée) alors qu'elle l'avait : une commande de la ligne, ou un
 * dialogue ou un menu ouvert depuis elle (rendu dans un portail, dont les
 * événements React remontent jusqu'à la ligne). Vaut pour toute commande :
 * `DeleteButton`, menu « … », dialogue de l'application.
 */
interface FocusDeLaLigne {
  /** La ligne, ou un dialogue ou un menu ouvert depuis elle, a le focus. */
  actif: boolean
  /** Cellule de la dernière commande focalisée dans la ligne elle-même. */
  rang: number
}

function useFocusDeLaLigne(
  ligneRef: RefObject<HTMLTableRowElement | null>,
  focus: RefObject<FocusDeLaLigne>
) {
  useLayoutEffect(
    () => () => {
      // Démontage : la ligne est encore dans le document.
      const ligne = ligneRef.current
      if (ligne && focus.current.actif)
        rendreFocusApresLigne(ligne, focus.current.rang)
    },
    [ligneRef, focus]
  )
}

/** Suivi du focus d'une ligne (`onFocus`, qui remonte aussi des portails
 *  React) : la ligne l'a, et dans quelle cellule. Dans la ligne de détail
 *  dépliée (`rang` faux), la cellule ne correspond à aucune colonne : la
 *  dernière connue reste. */
function noterFocus(
  event: FocusEvent<HTMLTableRowElement>,
  focus: FocusDeLaLigne,
  rang = true
) {
  focus.actif = true
  if (!rang) return
  const cellule = (event.target as Element).closest("td, th")
  if (
    cellule instanceof HTMLTableCellElement &&
    event.currentTarget.contains(cellule)
  )
    focus.rang = cellule.cellIndex
}

/**
 * Le focus quitte la ligne : elle ne l'a plus, y compris vers rien (clic
 * dans le vide). S'il va ailleurs dans la ligne, ou dans un dialogue ou un
 * menu ouvert depuis elle (portail), l'`onFocus` qui suit le lui rend.
 */
function noterPerte(focus: FocusDeLaLigne) {
  focus.actif = false
}

function LigneTableauBrute<TData extends RowData>({
  row,
  selectionnee,
  depliee,
  cliquable,
  activer,
  rendreDetail,
}: LigneTableauProps<TData>) {
  const table = row.table as DataTableInstance<TData>
  const ligneRef = useRef<HTMLTableRowElement>(null)
  const focus = useRef<FocusDeLaLigne>({ actif: false, rang: -1 })
  useFocusDeLaLigne(ligneRef, focus)
  const cellules = row.getVisibleCells()
  return (
    <>
      <TableRow
        ref={ligneRef}
        onFocus={(event) => noterFocus(event, focus.current)}
        onBlur={() => noterPerte(focus.current)}
        data-state={selectionnee ? "selected" : undefined}
        className={cn(cliquable && "cursor-pointer")}
        onClick={
          cliquable
            ? (event) => {
                if (estActivation(event)) activer(row)
              }
            : undefined
        }
      >
        {cellules.map((cell) => (
          <TableCell
            key={cell.id}
            className={cell.column.columnDef.meta?.className}
          >
            <table.FlexRender cell={cell} />
          </TableCell>
        ))}
      </TableRow>
      {depliee && rendreDetail ? (
        <TableRow
          data-slot="data-table-detail"
          className="bg-muted/30 hover:bg-muted/30"
          // Une commande du détail compte comme une commande de la ligne.
          onFocus={(event) => noterFocus(event, focus.current, false)}
          onBlur={() => noterPerte(focus.current)}
        >
          <TableCell
            id={metaDe(table).idDetail(row.id)}
            colSpan={cellules.length}
            className="p-0 whitespace-normal"
          >
            <div className="sticky left-0 w-[var(--data-table-largeur,100%)] p-3">
              {rendreDetail(row.original)}
            </div>
          </TableCell>
        </TableRow>
      ) : null}
    </>
  )
}

/** Une ligne ne se redessine que si ce qu'elle affiche a changé. Le rendu du
 *  détail n'est comparé que pour une ligne dépliée. */
const LigneTableau = memo(
  LigneTableauBrute,
  (avant, apres) =>
    avant.row === apres.row &&
    avant.selectionnee === apres.selectionnee &&
    avant.selectionnable === apres.selectionnable &&
    avant.depliee === apres.depliee &&
    avant.depliable === apres.depliable &&
    avant.cleColonnes === apres.cleColonnes &&
    avant.colonnes === apres.colonnes &&
    avant.cliquable === apres.cliquable &&
    avant.activer === apres.activer &&
    (!apres.depliee || avant.rendreDetail === apres.rendreDetail)
) as typeof LigneTableauBrute

/**
 * Proposition à la Gmail, au-dessus des lignes, quand la page est entièrement
 * cochée et que `total` compte d'autres éléments : « Les 25 éléments de la
 * page sont sélectionnés. Sélectionner les 137 éléments », puis « Les 137
 * éléments sont sélectionnés. Tout désélectionner ».
 */
function PropositionToutSelectionner<TData extends RowData>({
  table,
  unite,
  feminin,
}: {
  table: DataTableInstance<TData>
  unite: DataTableUnite
  feminin: boolean
}) {
  const meta = metaDe(table)
  const lignes = table.getRowModel().rows
  const { total } = meta
  const surPage = lignes.filter((row) => row.getIsSelected()).length
  if (
    total === undefined ||
    lignes.length === 0 ||
    !table.getIsAllPageRowsSelected() ||
    total <= surPage
  )
    return null

  return (
    <div
      data-slot="data-table-select-all"
      className="flex flex-wrap items-center justify-center gap-x-2 border-b bg-muted/50 px-3 py-1.5 text-center text-sm"
    >
      {meta.toutSelectionne ? (
        <>
          <span>{phraseToutSelectionne(total, unite, feminin)}</span>
          <Button
            variant="link"
            className="h-auto px-0"
            onClick={() => {
              // Le bandeau disparaît avec la sélection : le focus passe
              // d'abord à la case d'en-tête.
              focaliserTableau(meta.racine.current)
              meta.toutDeselectionner()
            }}
          >
            Tout désélectionner
          </Button>
        </>
      ) : (
        <>
          <span>
            {surPage > 1
              ? `Les ${nombreFr(surPage)} ${unite.pluriel} de la page sont ${participe("sélectionné", 2, feminin)}.`
              : `1 ${unite.singulier} de la page est ${participe("sélectionné", 1, feminin)}.`}
          </span>
          <Button
            variant="link"
            className="h-auto px-0"
            onClick={() => meta.changerToutSelectionne(true)}
          >
            {`Sélectionner les ${nombreFr(total)} ${unite.pluriel}`}
          </Button>
        </>
      )}
    </div>
  )
}

/** `aria-sort` sur la seule colonne triée : « non trié » sur chaque autre
 *  colonne triable serait du bruit. */
function triAria<TData extends RowData>(
  colonne: Colonne<TData>
): "ascending" | "descending" | undefined {
  const sens = colonne.getIsSorted()
  if (sens === "asc") return "ascending"
  if (sens === "desc") return "descending"
  return undefined
}

export interface DataTableColumnHeaderProps<TData extends RowData, TValue> {
  column: Column<DataTableFeatures, TData, TValue>
  /** Nom de la colonne, affiché. */
  libelle: string
  className?: string
}

/**
 * En-tête triable, comme dans le guide de shadcn : un bouton fantôme avec
 * l'icône du sens en cours. Un clic trie par ordre croissant, le suivant
 * inverse le sens (le tri choisi est annoncé). Simple texte si la colonne ne
 * se trie pas. On masque une colonne par `DataTableViewOptions`.
 */
export function DataTableColumnHeader<TData extends RowData, TValue>({
  column,
  libelle,
  className,
}: DataTableColumnHeaderProps<TData, TValue>) {
  if (!column.getCanSort()) return <div className={className}>{libelle}</div>
  const sens = column.getIsSorted()
  const Icone =
    sens === "desc"
      ? ArrowDownIcon
      : sens === "asc"
        ? ArrowUpIcon
        : ChevronsUpDownIcon

  return (
    <div className={cn("flex items-center gap-2", className)}>
      <Button
        variant="ghost"
        size="sm"
        className="-ml-2.5 h-8 text-sm"
        onClick={() => column.toggleSorting(sens === "asc")}
      >
        <span>{libelle}</span>
        <Icone
          data-icon="inline-end"
          className={cn(!sens && "text-muted-foreground")}
        />
      </Button>
    </div>
  )
}

export interface DataTableSelectionColumnOptions<TData extends RowData> {
  /** Nom de la case d'une ligne : « Sélectionner Ada Lovelace ».
   *  « Sélectionner la ligne » par défaut. */
  libelleLigne?: (ligne: TData) => string
  /** Nom de la case d'en-tête, qui coche les lignes affichées.
   *  « Sélectionner la page » par défaut. */
  libelleTout?: string
  /** Pourquoi une ligne ne peut pas être sélectionnée : la case reste
   *  focalisable et dit sa raison (infobulle et description). */
  verrouLigne?: (ligne: TData) => string | undefined
}

/**
 * Colonne de cases à cocher de shadcn (`id: "select"`), avec Maj+clic pour
 * sélectionner ou désélectionner toute la plage depuis la dernière case
 * cochée. La case d'en-tête porte sur les lignes affichées ; depuis l'état
 * partiel, elle les sélectionne toutes. La zone cliquable de chaque case
 * couvre sa cellule.
 */
export function dataTableSelectionColumn<TData extends RowData>({
  libelleLigne,
  libelleTout = "Sélectionner la page",
  verrouLigne,
}: DataTableSelectionColumnOptions<TData> = {}): DataTableColumnDef<TData> {
  return createDataTableColumnHelper<TData>().display({
    id: "select",
    header: ({ table }) => {
      const selectionnables = table
        .getRowModel()
        .rows.filter((row) => row.getCanSelect())
      const toutes = table.getIsAllPageRowsSelected()
      return (
        <Checkbox
          checked={toutes}
          indeterminate={table.getIsSomePageRowsSelected() && !toutes}
          disabled={selectionnables.length === 0}
          onCheckedChange={(coche) => table.toggleAllPageRowsSelected(coche)}
          aria-label={libelleTout}
          className={ZONE_CASE}
        />
      )
    },
    cell: ({ row }) => (
      <CaseLigne
        row={row}
        libelle={libelleLigne?.(row.original) ?? "Sélectionner la ligne"}
        verrou={row.getCanSelect() ? undefined : verrouLigne?.(row.original)}
      />
    ),
    enableSorting: false,
    enableHiding: false,
    // La cellule a la largeur de la zone de la case (12 + 16 + 12 px) : avec
    // `w-8` et sans marge droite, la zone débordait de 12 px sur la colonne
    // suivante, dont un clic au début cochait la ligne.
    meta: { className: COLONNE_CASE },
  })
}

/** Zone cliquable d'une case de tableau : 40 × 40 px autour du carré de
 *  16 px, plus facile au doigt. */
const ZONE_CASE = "after:-inset-3"

/** Cellule de la colonne de sélection : la largeur de sa zone cliquable. La
 *  marge droite remplace le `pr-0` que `TableCell` donne à une case. */
const COLONNE_CASE = "w-10 px-3 [&:has([role=checkbox])]:pr-3"

/**
 * Case verrouillée lisible : ni estompée (à 50 %, son bord tombait sous
 * 3:1), ni confondue avec une case active. Vide, fond gris et bord plein ;
 * cochée, gris foncé (`--muted-foreground`) au lieu de la couleur d'accent.
 */
export const CASE_VERROUILLEE =
  "aria-disabled:cursor-not-allowed aria-disabled:opacity-100 aria-disabled:not-data-checked:bg-muted aria-disabled:data-checked:border-muted-foreground aria-disabled:data-checked:bg-muted-foreground aria-disabled:data-checked:text-background"

function CaseLigne<TData extends RowData>({
  row,
  libelle,
  verrou,
}: {
  row: Row<DataTableFeatures, TData>
  libelle: string
  verrou?: string
}) {
  const idVerrou = useId()
  // Le gestionnaire de TanStack tient l'ancre de la plage et lit
  // `target.checked` et `shiftKey` : la case de Base UI transmet le clic
  // d'origine, modificateurs compris.
  const basculer = row.getToggleSelectedHandler()
  const selectionnable = row.getCanSelect()
  const caseACocher = (
    <Checkbox
      checked={row.getIsSelected()}
      // Non sélectionnable avec une raison : en lecture seule plutôt que
      // désactivée, la case reste un seul arrêt clavier qui dit pourquoi.
      disabled={!selectionnable && !verrou}
      readOnly={!selectionnable}
      aria-disabled={!selectionnable || undefined}
      aria-describedby={verrou ? idVerrou : undefined}
      aria-label={libelle}
      className={cn(ZONE_CASE, CASE_VERROUILLEE)}
      onCheckedChange={(coche, details) =>
        basculer({
          target: { checked: coche },
          shiftKey: (details.event as Partial<globalThis.MouseEvent>).shiftKey,
        })
      }
      // Maj+appui étendrait sinon la sélection de texte sur les lignes
      // intermédiaires.
      onMouseDown={(event) => {
        if (event.shiftKey) event.preventDefault()
      }}
    />
  )
  if (!verrou) return caseACocher
  return (
    <>
      <Tooltip>
        <TooltipTrigger render={caseACocher} />
        <TooltipContent>{verrou}</TooltipContent>
      </Tooltip>
      <span id={idVerrou} hidden>
        {verrou}
      </span>
    </>
  )
}

export interface DataTableExpandColumnOptions<TData extends RowData> {
  /** Nom du bouton d'une ligne, lu et affiché en infobulle : « Détail de
   *  l'erreur du 12 octobre ». « Détail de la ligne » par défaut. Son état
   *  (déplié ou non) est dit par `aria-expanded`. */
  libelleLigne?: (ligne: TData) => string
  /** Nom de la colonne pour les lecteurs d'écran. « Détail » par défaut. */
  libelle?: string
}

/**
 * Colonne du bouton qui déplie une ligne (`id: "expand"`), comme le chevron
 * des exemples TanStack et shadcn : bouton à icône seule avec infobulle,
 * `aria-expanded` et `aria-controls` vers le détail. Le détail lui-même est
 * rendu par `rendreDetail` de `DataTable`. Rien pour une ligne non dépliable
 * (`ligneDepliable`).
 */
export function dataTableExpandColumn<TData extends RowData>({
  libelleLigne,
  libelle = "Détail",
}: DataTableExpandColumnOptions<TData> = {}): DataTableColumnDef<TData> {
  return createDataTableColumnHelper<TData>().display({
    id: "expand",
    header: () => <span className="sr-only">{libelle}</span>,
    cell: ({ row, table }) =>
      row.getCanExpand() ? (
        <BoutonDeplier
          deplie={row.getIsExpanded()}
          onBasculer={() => row.toggleExpanded()}
          libelle={libelleLigne?.(row.original) ?? "Détail de la ligne"}
          // Seulement pour une ligne dépliée : `aria-controls` ne vise que
          // le détail rendu.
          idDetail={
            row.getIsExpanded()
              ? metaDe(table as DataTableInstance<TData>).idDetail(row.id)
              : undefined
          }
        />
      ) : null,
    enableSorting: false,
    enableHiding: false,
    meta: { className: "w-8" },
  })
}

function BoutonDeplier({
  deplie,
  onBasculer,
  libelle,
  idDetail,
}: {
  deplie: boolean
  onBasculer: () => void
  libelle: string
  idDetail?: string
}) {
  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <Button
            variant="ghost"
            size="icon-xs"
            aria-label={libelle}
            aria-expanded={deplie}
            // Seulement quand le détail existe : une référence vers un
            // élément absent serait fautive.
            aria-controls={deplie ? idDetail : undefined}
            onClick={onBasculer}
          />
        }
      >
        <ChevronRightIcon
          className={cn(
            "transition-transform motion-reduce:transition-none",
            deplie && "rotate-90"
          )}
        />
      </TooltipTrigger>
      <TooltipContent>{libelle}</TooltipContent>
    </Tooltip>
  )
}

export interface DataTableRowActionsProps {
  /** Entrées du menu : `DropdownMenuItem`, `DropdownMenuSeparator`… */
  children: ReactNode
  /** Nom du bouton, lu et affiché en infobulle, propre à la ligne pour que
   *  les boutons se distinguent : « Actions pour Ada Lovelace ». */
  libelle: string
}

/** Menu d'actions d'une ligne, comme dans le guide de shadcn : bouton « … »
 *  fantôme à icône seule, menu aligné à droite. */
export function DataTableRowActions({
  children,
  libelle,
}: DataTableRowActionsProps) {
  return (
    <DropdownMenu>
      <Tooltip>
        <TooltipTrigger
          render={
            <DropdownMenuTrigger
              render={
                <Button variant="ghost" size="icon-xs" aria-label={libelle} />
              }
            />
          }
        >
          <MoreHorizontalIcon />
        </TooltipTrigger>
        <TooltipContent>{libelle}</TooltipContent>
      </Tooltip>
      <DropdownMenuContent align="end" className="w-44">
        {children}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

export interface DataTableActionsColumnOptions<TData extends RowData> {
  /** Les commandes d'une ligne : `DeleteButton`, `TooltipButton`,
   *  `DataTableRowActions`… alignées à droite. */
  actions: (ligne: TData) => ReactNode
  /** Nom de la colonne, lu par les lecteurs d'écran (l'en-tête reste
   *  vide à l'écran) et affiché dans le sélecteur de colonnes. « Actions »
   *  par défaut. */
  libelle?: string
  /** Identifiant de la colonne. « actions » par défaut. */
  id?: string
  /** Colonne masquable et déplaçable par « Colonnes ». Non par défaut. */
  enableHiding?: boolean
  /** Classes ajoutées à l'en-tête et aux cellules, après `w-px`. */
  className?: string
}

/**
 * Colonne des commandes d'une ligne (`id: "actions"`, comme dans shadcn) :
 * en-tête lu mais invisible, colonne aussi étroite que son contenu,
 * commandes alignées à droite. Ni triable ni masquable. Comme toute colonne,
 * à créer hors du composant ou mémorisée : un état de la page passe par un
 * contexte ou un hook lu dans la cellule, pas par la fermeture de `actions`.
 */
export function dataTableActionsColumn<TData extends RowData>({
  actions,
  libelle = "Actions",
  id = "actions",
  enableHiding = false,
  className,
}: DataTableActionsColumnOptions<TData>): DataTableColumnDef<TData> {
  return createDataTableColumnHelper<TData>().display({
    id,
    header: () => <span className="sr-only">{libelle}</span>,
    cell: ({ row }) => (
      <div className="flex items-center justify-end gap-1">
        {actions(row.original)}
      </div>
    ),
    enableSorting: false,
    enableHiding,
    meta: { libelle, className: cn("w-px", className) },
  })
}

type DataTableCellLinkCommun = {
  children: ReactNode
  className?: string
}

/** Lien de cellule : une adresse, suivie par le lien du routeur. */
export type DataTableCellLinkProps = DataTableCellLinkCommun &
  Omit<ComponentProps<"a">, "children" | "className"> & {
    href: string
    /** Lien du routeur de l'application ; par défaut, celui du
     *  `LienProvider`, sinon un `<a>`. */
    lien?: LienComposant
  }

/** Bouton de cellule : une action sur place (ouvrir la modification…). */
export type DataTableCellButtonProps = DataTableCellLinkCommun &
  Omit<ComponentProps<"button">, "children" | "className"> & {
    href?: never
    lien?: never
  }

/** Style du titre d'une ligne : texte en gras, souligné au survol, anneau
 *  de focus de la bibliothèque. */
const TITRE_DE_LIGNE =
  "rounded-sm text-left font-medium underline-offset-4 outline-none hover:underline focus-visible:ring-3 focus-visible:ring-ring/50"

/**
 * Titre d'une ligne qui mène à sa fiche : un vrai lien (`href`, routeur par
 * `lien` ou le `LienProvider`), ou un bouton sans `href` (ouvrir la modification). Le clic de
 * ligne (`onActiverLigne`) n'est qu'un raccourci à la souris : ce lien est
 * le chemin du clavier et des lecteurs d'écran, et garde l'ouverture dans un
 * nouvel onglet.
 */
export function DataTableCellLink(
  props: DataTableCellLinkProps | DataTableCellButtonProps
) {
  const { lien, ...reste } = props
  const Lien = useLien(lien)
  if (reste.href !== undefined) {
    const { className, ...lienProps } = reste
    return (
      // `Lien` vient des props ou du contexte : stable (voir `ButtonLink`).
      // eslint-disable-next-line react-hooks/static-components
      <Lien
        data-slot="data-table-cell-link"
        className={cn(TITRE_DE_LIGNE, className)}
        {...lienProps}
      />
    )
  }
  const { className, type = "button", ...boutonProps } = reste
  return (
    <button
      data-slot="data-table-cell-link"
      type={type}
      className={cn(TITRE_DE_LIGNE, "cursor-pointer", className)}
      {...boutonProps}
    />
  )
}
