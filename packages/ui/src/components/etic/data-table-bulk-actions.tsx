import {
  useEffect,
  useEffectEvent,
  useId,
  useLayoutEffect,
  useRef,
  useState,
  type ReactNode,
  type RefObject,
} from "react"
import type { RowData } from "@tanstack/react-table"
import { cn } from "cn"
import { XIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import { Separator } from "@etic-ui/components/ui/separator"
import {
  metaDe,
  type DataTableInstance,
} from "@etic-ui/components/etic/data-table"
import { focaliserTableau } from "@etic-ui/components/etic/data-table-focus"
import {
  UNITE_PAR_DEFAUT,
  nombreFr,
  participe,
  uniteAccordee,
  type DataTableUnite,
} from "@etic-ui/components/etic/data-table-format"

/** Un Échap tapé dans un champ (recherche dans une cellule…) lui revient. */
function echapPourUnChamp(event: KeyboardEvent): boolean {
  if (event.defaultPrevented) return true
  const cible = event.target
  return (
    cible instanceof HTMLElement &&
    (cible.isContentEditable ||
      /^(INPUT|TEXTAREA|SELECT)$/.test(cible.tagName)) &&
    !(cible instanceof HTMLInputElement && cible.type === "checkbox")
  )
}

interface DataTableBulkActionsCommun {
  /** Nom des éléments : « 3 personnes sélectionnées ». « élément »,
   *  « éléments » par défaut. */
  unite?: DataTableUnite
  /** Accorde « sélectionnées » au féminin. */
  feminin?: boolean
  /** Les actions : boutons `size="sm"`. Les lignes visées viennent de
   *  `table.getSelectedRowModel()` (ou `getSelectedRowIds()`) ; quand
   *  `toutSelectionne` est vrai, l'action porte sur tous les éléments. */
  children: ReactNode
  className?: string
}

/** Barre branchée sur l'instance d'un `DataTable`. */
export interface DataTableBulkActionsTableProps<
  TData extends RowData,
> extends DataTableBulkActionsCommun {
  table: DataTableInstance<TData>
}

/**
 * Barre d'un tableau rendu à la main, sans instance `useDataTable` : la
 * sélection est celle de l'application.
 */
export interface DataTableBulkActionsSelectionProps extends DataTableBulkActionsCommun {
  table?: never
  /** Nombre d'éléments sélectionnés ; la barre s'affiche dès 1. */
  nombre: number
  /** « Tout désélectionner » et Échap. */
  onToutDeselectionner: () => void
  /** Cadre du tableau : Échap y vide la sélection, et le focus y revient
   *  (sa case d'en-tête, sinon le cadre) quand la barre disparaît. */
  racine?: RefObject<HTMLElement | null>
}

export type DataTableBulkActionsProps<TData extends RowData = RowData> =
  DataTableBulkActionsTableProps<TData> | DataTableBulkActionsSelectionProps

/** Nombre, remise à zéro et cadre, lus dans le tableau ou donnés. */
function selectionDe<TData extends RowData>(
  props: DataTableBulkActionsProps<TData>
): {
  nombre: number
  toutDeselectionner: () => void
  racine: () => HTMLElement | null
} {
  if (!props.table)
    return {
      nombre: props.nombre,
      toutDeselectionner: props.onToutDeselectionner,
      racine: () => props.racine?.current ?? null,
    }
  const { table } = props
  const meta = metaDe(table)
  return {
    // « Tous sélectionnés » : le total, pas seulement les lignes de la page.
    nombre:
      meta.toutSelectionne && meta.total !== undefined
        ? meta.total
        : table.getSelectedRowIds().length,
    toutDeselectionner: meta.toutDeselectionner,
    racine: () => meta.racine.current,
  }
}

/**
 * Barre d'actions groupées : apparaît avec la sélection, dit combien
 * d'éléments sont sélectionnés, porte les actions et « Tout désélectionner »
 * (aussi Échap, quand le focus est dans le tableau ou dans la barre). À
 * placer une fois, après le tableau : collante en bas de l'écran, elle reste
 * à portée au-dessus d'un long tableau sans le décaler.
 *
 * Quand elle disparaît avec le focus dedans (« Tout désélectionner », Échap,
 * action qui vide la sélection), le focus passe à la case d'en-tête du
 * tableau plutôt que de tomber sur `<body>`.
 *
 * Avec `table`, elle suit la sélection d'un `DataTable` ; avec `nombre`,
 * `onToutDeselectionner` et `racine`, celle d'un tableau rendu à la main.
 * Sur téléphone, le compte et « × » restent ensemble sur la première ligne,
 * les actions passent dessous.
 */
export function DataTableBulkActions<TData extends RowData>(
  props: DataTableBulkActionsProps<TData>
) {
  const {
    unite = UNITE_PAR_DEFAUT,
    feminin = false,
    children,
    className,
  } = props
  const idResume = useId()
  const barreRef = useRef<HTMLDivElement>(null)
  const { nombre, toutDeselectionner: vider, racine } = selectionDe(props)
  const visible = nombre > 0
  const resume = `${uniteAccordee(nombre, unite)} ${participe("sélectionné", nombre, feminin)}`

  // Dernier élément de la barre qui a eu le focus, tant que le focus n'est
  // pas parti ailleurs : s'il disparaît avec la barre, on rattrape le focus.
  const focusDansBarre = useRef<HTMLElement | null>(null)
  const toutDeselectionner = () => {
    if (barreRef.current?.contains(document.activeElement))
      focaliserTableau(racine())
    vider()
  }
  useLayoutEffect(() => {
    if (visible) return
    const perdu = focusDansBarre.current
    focusDansBarre.current = null
    if (
      perdu &&
      !perdu.isConnected &&
      (!document.activeElement || document.activeElement === document.body)
    )
      focaliserTableau(racine())
  })

  // Une sélection effacée est dite : la zone garderait sinon le dernier
  // compte. Rien avant la première sélection.
  const [dejaVisible, setDejaVisible] = useState(visible)
  if (visible && !dejaVisible) setDejaVisible(true)

  const surTouche = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || echapPourUnChamp(event)) return
    // Échap ne s'adresse à la barre que depuis le tableau ou la barre : pas
    // depuis la navigation, ni depuis un dialogue ou un menu (rendus hors du
    // tableau, dans un portail).
    const cible = event.target as Node
    const dansTableau = racine()?.contains(cible) ?? false
    if (!dansTableau && !barreRef.current?.contains(cible)) return
    toutDeselectionner()
  })
  useEffect(() => {
    if (!visible) return
    document.addEventListener("keydown", surTouche)
    return () => document.removeEventListener("keydown", surTouche)
  }, [visible])

  return (
    <>
      {/* Toujours montée : une zone annoncée insérée avec son texte n'est
          pas lue de façon fiable, la première case cochée passerait sous
          silence. */}
      <div
        data-slot="data-table-bulk-actions-status"
        className="sr-only"
        aria-live="polite"
        aria-atomic="true"
      >
        {visible
          ? `${nombreFr(nombre)} ${resume}`
          : dejaVisible
            ? "Sélection effacée"
            : null}
      </div>
      {visible ? (
        <div
          ref={barreRef}
          data-slot="data-table-bulk-actions"
          role="toolbar"
          aria-labelledby={idResume}
          onFocus={(event) => {
            focusDansBarre.current = event.target
          }}
          onBlur={(event) => {
            const vers = event.relatedTarget
            if (vers && !event.currentTarget.contains(vers))
              focusDansBarre.current = null
          }}
          className={cn(
            "sticky bottom-4 z-20 mx-auto flex w-fit max-w-full flex-wrap items-center gap-2 rounded-xl border bg-popover p-1.5 pl-3 text-sm text-popover-foreground shadow-lg",
            className
          )}
        >
          <span id={idResume} className="whitespace-nowrap">
            <strong className="font-medium tabular-nums">
              {nombreFr(nombre)}
            </strong>{" "}
            {resume}
          </span>
          <Separator
            orientation="vertical"
            className="h-5 self-center! max-sm:hidden"
          />
          {/* Sur mobile, le compte et « Tout désélectionner » forment la
              première ligne, les actions la suivante : la barre ne finit
              plus sur une croix seule. L'ordre du DOM (celui de la
              tabulation) reste celui du bureau. */}
          <div className="flex flex-wrap items-center gap-1.5 max-sm:order-last max-sm:basis-full">
            {children}
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={toutDeselectionner}
            aria-keyshortcuts="Escape"
            className="max-sm:ml-auto"
          >
            <XIcon data-icon="inline-start" />
            {/* Sur mobile, l'icône seule garde la barre sur une ligne. */}
            <span className="max-sm:sr-only">Tout désélectionner</span>
          </Button>
        </div>
      ) : null}
    </>
  )
}
