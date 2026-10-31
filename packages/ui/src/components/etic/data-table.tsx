import {
  memo,
  useCallback,
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type MouseEvent,
  type ReactNode,
  type RefObject,
} from "react"
import {
  columnOrderingFeature,
  columnVisibilityFeature,
  createColumnHelper,
  createSortedRowModel,
  functionalUpdate,
  metaHelper,
  rowExpandingFeature,
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
  type ColumnOrderState,
  type ColumnVisibilityState,
  type ExpandedStateList,
  type OnChangeFn,
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
  /**
   * Cadre du tableau. `DataTable` le pose sur le sien ; un tableau rendu à
   * la main avec les primitives `Table` le pose sur son conteneur
   * (`ref={table.options.meta.racine}`). `DataTableBulkActions` y limite
   * Échap et y rend le focus quand la sélection est vidée.
   */
  racine: RefObject<HTMLDivElement | null>
  /** Identifiant du détail d'une ligne dépliée (cible d'`aria-controls`). */
  idDetail: (idLigne: string) => string
}

/**
 * Fonctions de TanStack Table v9 dont se sert `DataTable` : tri (côté client,
 * ou côté serveur avec `triManuel`), visibilité et ordre des colonnes,
 * sélection et dépliage de lignes. Comme dans le guide Data Table de shadcn,
 * les colonnes se déclarent avec ce registre :
 * `createDataTableColumnHelper<T>()`.
 */
export const dataTableFeatures = tableFeatures({
  columnOrderingFeature,
  columnVisibilityFeature,
  rowExpandingFeature,
  rowSelectionFeature,
  rowSortingFeature,
  sortedRowModel: createSortedRowModel(),
  sortFns: {
    alphanumeric: sortFn_alphanumeric,
    basic: sortFn_basic,
    datetime: sortFn_datetime,
    text: sortFn_text,
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
 * Rend le focus à un élément stable du tableau avant qu'un contrôle qui l'a
 * ne disparaisse (bandeau ou barre de sélection) : la case d'en-tête, sinon
 * le cadre lui-même.
 */
export function focaliserTableau(racine: HTMLElement | null) {
  if (!racine) return
  const caseEntete = racine.querySelector<HTMLElement>(
    'thead [role="checkbox"]:not([data-disabled])'
  )
  if (caseEntete) return caseEntete.focus()
  if (!racine.hasAttribute("tabindex")) racine.tabIndex = -1
  racine.focus()
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

  visibiliteColonnes?: ColumnVisibilityState
  onVisibiliteColonnesChange?: OnChangeFn<ColumnVisibilityState>
  /** Identifiants des colonnes dans l'ordre d'affichage. */
  ordreColonnes?: ColumnOrderState
  onOrdreColonnesChange?: OnChangeFn<ColumnOrderState>

  /** Sélection contrôlée : `{ [idLigne]: true }`. */
  selection?: RowSelectionState
  onSelectionChange?: OnChangeFn<RowSelectionState>
  /** Une ligne peut-elle être sélectionnée ? Toutes, par défaut. Référence
   *  stable de préférence : elle est relue à chaque changement. */
  ligneSelectionnable?: (ligne: TData) => boolean
  /**
   * Par défaut, la sélection ne garde que des lignes présentes dans
   * `donnees` : changer de page, de filtre ou supprimer des lignes la
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
  }
}

/** Réduit un état `{ [id]: booléen }` aux identifiants présents, chacun avec
 *  sa valeur d'origine (une entrée `false` reste `false`) ; même objet quand
 *  rien ne part (ni rendu ni `on…Change`). */
function restreindre<T extends Record<string, boolean>>(
  avant: T,
  presents: Set<string>
): T {
  const gardes = Object.entries(avant).filter(([id]) => presents.has(id))
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
  visibiliteColonnes,
  onVisibiliteColonnesChange,
  ordreColonnes,
  onOrdreColonnesChange,
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
  const [toutInterne, setToutInterne] = useState(false)
  const tout = toutSelectionne ?? toutInterne
  const changerTout = (valeur: boolean) => {
    if (toutSelectionne === undefined) setToutInterne(valeur)
    onToutSelectionneChange?.(valeur)
  }
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

  const [selectionInterne, setSelectionInterne] = useState<RowSelectionState>(
    {}
  )
  const selectionCourante = selection ?? selectionInterne
  state.rowSelection = selectionCourante
  controle.onRowSelectionChange = (maj) => {
    const suivante = functionalUpdate(maj, selectionCourante)
    // Même objet : rien n'a changé, rien à signaler.
    if (suivante === selectionCourante) return
    if (selection === undefined) setSelectionInterne(suivante)
    onSelectionChange?.(suivante)
  }

  const [deplieesInternes, setDeplieesInternes] = useState<ExpandedStateList>(
    etatInitial?.lignesDepliees ?? {}
  )
  const deplieesCourantes = lignesDepliees ?? deplieesInternes
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
    if (suivante === deplieesCourantes) return
    if (lignesDepliees === undefined) setDeplieesInternes(suivante)
    onLignesDeplieesChange?.(suivante)
  }

  const table: DataTableInstance<TData> = useTable({
    features: dataTableFeatures,
    data: donnees,
    columns: colonnes,
    getRowId: idLigne,
    manualSorting: triManuel,
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
    },
    state,
    ...controle,
    meta: {
      total,
      // Affiché seulement si la page est bien cochée, y compris au rendu qui
      // précède la remise à `false` ci-dessous.
      // (getter : lu après la création de `table`, dont il interroge les lignes).
      get toutSelectionne(): boolean {
        return tout && pageEntierementCochee()
      },
      changerToutSelectionne: (valeur) => {
        if (valeur) table.toggleAllPageRowsSelected(true)
        changerTout(valeur)
      },
      toutDeselectionner: () => {
        table.resetRowSelection(true)
        if (tout) changerTout(false)
      },
      racine,
      idDetail: (id) => `${prefixe}detail-${encodeURIComponent(id)}`,
    },
  })

  // Les identifiants viennent du modèle de lignes de TanStack, mémorisé sur
  // `donnees` : `idLigne` n'est pas rappelé à chaque rendu.
  const lignesPage = table.getCoreRowModel().rows
  const clePage = lignesPage.map((row) => row.id).join("\u0000")
  function pageEntierementCochee(): boolean {
    const selectionnables = table
      .getCoreRowModel()
      .rows.filter((row) => row.getCanSelect())
    return (
      selectionnables.length > 0 &&
      selectionnables.every((row) => selectionCourante[row.id])
    )
  }
  const pageCochee = pageEntierementCochee()

  // « Tous sélectionnés » ne vaut que pour la page où l'utilisateur l'a
  // demandé, entièrement cochée : il retombe quand la page change (même si
  // `conserverSelection` y garde des lignes cochées) et dès qu'une ligne de
  // la page n'est plus cochée, que ce soit par le tableau ou par
  // l'application (sélection contrôlée remplacée).
  const clePagePrecedente = useRef(clePage)
  const finTout = useEffectEvent(() => changerTout(false))
  useEffect(() => {
    const pageChangee = clePagePrecedente.current !== clePage
    clePagePrecedente.current = clePage
    if (tout && (pageChangee || !pageCochee)) finTout()
  }, [clePage, pageCochee, tout])

  const restreindreEtat = useEffectEvent(() => {
    const presents = new Set(lignesPage.map((row) => row.id))
    if (!conserverSelection)
      table.setRowSelection((avant) => restreindre(avant, presents))
    table.setExpanded((avant) =>
      avant === true ? avant : restreindre(avant, presents)
    )
  })
  useEffect(() => {
    restreindreEtat()
  }, [lignesPage])

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

export interface DataTableProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Nom du tableau pour les lecteurs d'écran : « Membres ». */
  libelle: string
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
  enChargement = false,
  lignesChargement = 10,
  vide = "Aucun résultat.",
  onActiverLigne,
  rendreDetail,
  unite = UNITE_PAR_DEFAUT,
  feminin = false,
  className,
}: DataTableProps<TData>) {
  const lignes = table.getRowModel().rows
  const colonnesVisibles = table.getVisibleLeafColumns()
  const cleColonnes = colonnesVisibles.map((colonne) => colonne.id).join(" ")
  const meta = table.options.meta
  const racine = meta?.racine

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
  // les colonnes défilent.
  const [largeurCadre, setLargeurCadre] = useState<number>()
  useEffect(() => {
    const cadre = racine?.current?.querySelector<HTMLElement>(
      '[data-slot="table-container"]'
    )
    if (!cadre || typeof ResizeObserver === "undefined") return
    const observateur = new ResizeObserver(() =>
      setLargeurCadre(cadre.clientWidth)
    )
    observateur.observe(cadre)
    return () => observateur.disconnect()
  }, [racine])

  const annonce = useAnnonce(table, enChargement && lignes.length === 0, {
    unite,
    feminin,
  })

  return (
    <div
      ref={racine}
      data-slot="data-table"
      className={cn("min-w-0 overflow-hidden rounded-md border", className)}
      style={
        largeurCadre
          ? ({ "--data-table-largeur": `${largeurCadre}px` } as CSSProperties)
          : undefined
      }
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
            enChargement && lignes.length > 0 && "opacity-60 transition-opacity"
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
                nombreColonnes={colonnesVisibles.length}
                idDetail={meta?.idDetail(row.id)}
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
  )
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

  const meta = table.options.meta
  if (chargementInitial) return "Chargement…"
  if (meta?.toutSelectionne && meta.total !== undefined)
    return `Les ${nombreFr(meta.total)} ${unite.pluriel} sont ${participe("sélectionné", 2, feminin)}.`
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
  nombreColonnes: number
  idDetail?: string
}

function LigneTableauBrute<TData extends RowData>({
  row,
  selectionnee,
  depliee,
  cliquable,
  activer,
  rendreDetail,
  nombreColonnes,
  idDetail,
}: LigneTableauProps<TData>) {
  const table = row.table as DataTableInstance<TData>
  return (
    <>
      <TableRow
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
        {row.getVisibleCells().map((cell) => (
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
        >
          <TableCell
            id={idDetail}
            colSpan={nombreColonnes}
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
    avant.nombreColonnes === apres.nombreColonnes &&
    avant.idDetail === apres.idDetail &&
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
  const meta = table.options.meta
  const lignes = table.getRowModel().rows
  const total = meta?.total
  const surPage = lignes.filter((row) => row.getIsSelected()).length
  if (
    !meta ||
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
          <span>
            {`Les ${nombreFr(total)} ${unite.pluriel} sont ${participe("sélectionné", 2, feminin)}.`}
          </span>
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
    meta: { className: "w-8" },
  })
}

/** Zone cliquable d'une case de tableau : 40 × 40 px autour du carré de
 *  16 px, soit la cellule entière, plus facile au doigt. */
const ZONE_CASE = "after:-inset-3"

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
      className={cn(
        ZONE_CASE,
        "aria-disabled:cursor-not-allowed aria-disabled:opacity-50"
      )}
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
          idDetail={table.options.meta?.idDetail(row.id)}
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
