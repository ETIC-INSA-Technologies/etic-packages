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
import { ListChecksIcon, MoreHorizontalIcon, XIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@etic-ui/components/ui/dropdown-menu"
import { TooltipButton } from "@etic-ui/components/etic/tooltip-button"
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
  /** Actions moins fréquentes, rangées dans le menu « … » de la barre :
   *  des `DropdownMenuItem`. Le menu porte aussi « Sélectionner les 137 »
   *  quand il est proposé. Une entrée qui vide aussitôt la sélection
   *  démonte la barre et son menu : le focus tombe alors sur la page, pas
   *  sur un autre menu (`DropdownMenuContent`). */
  actionsSecondaires?: ReactNode
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

/** Nombre, remise à zéro et cadre, lus dans le tableau ou donnés ; avec un
 *  tableau, le total (« 25 membres sur 137 ») et sa proposition
 *  (« Sélectionner les 137 »). */
function selectionDe<TData extends RowData>(
  props: DataTableBulkActionsProps<TData>
): {
  nombre: number
  toutDeselectionner: () => void
  racine: () => HTMLElement | null
  /** Total dont la sélection n'est qu'une partie. */
  surTotal?: number
  /** Total à proposer et son action. */
  proposition?: { total: number; selectionner: () => void }
} {
  if (!props.table)
    return {
      nombre: props.nombre,
      toutDeselectionner: props.onToutDeselectionner,
      racine: () => props.racine?.current ?? null,
    }
  const { table } = props
  const meta = metaDe(table)
  const aProposer = meta.totalAProposer
  // « Tous sélectionnés » : le total, pas seulement les lignes de la page.
  const nombre =
    meta.toutSelectionne && meta.total !== undefined
      ? meta.total
      : table.getSelectedRowIds().length
  return {
    nombre,
    toutDeselectionner: meta.toutDeselectionner,
    racine: () => meta.racine.current,
    surTotal:
      meta.total !== undefined && meta.total > nombre ? meta.total : undefined,
    proposition:
      aProposer === undefined
        ? undefined
        : {
            total: aProposer,
            selectionner: () => meta.changerToutSelectionne(true),
          },
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
 * Avec le `total` du tableau, le compte le situe (« 25 membres sur 137
 * sélectionnés ») ; quand toute la page est cochée, le menu « … » propose
 * « Sélectionner les 137 membres » (à la Gmail), à côté des
 * `actionsSecondaires`. Le menu n'apparaît que s'il a quelque chose à
 * proposer ; « Tout désélectionner » est une croix seule, avec infobulle.
 *
 * Avec `table`, elle suit la sélection d'un `DataTable` ; avec `nombre`,
 * `onToutDeselectionner` et `racine`, celle d'un tableau rendu à la main.
 * Sur téléphone, le compte, « … » et « × » restent ensemble sur la première
 * ligne, les actions passent dessous.
 */
export function DataTableBulkActions<TData extends RowData>(
  props: DataTableBulkActionsProps<TData>
) {
  const {
    unite = UNITE_PAR_DEFAUT,
    feminin = false,
    children,
    actionsSecondaires,
    className,
  } = props
  const idResume = useId()
  const barreRef = useRef<HTMLDivElement>(null)
  const boutonDeselectionner = useRef<HTMLButtonElement>(null)
  // Entrée de « … » choisie, à exécuter une fois le menu fermé.
  const apresFermeture = useRef<(() => void) | null>(null)
  const {
    nombre,
    toutDeselectionner: vider,
    racine,
    surTotal,
    proposition,
  } = selectionDe(props)
  const visible = nombre > 0
  // « membres sur 137 sélectionnés », après le nombre (en gras à l'écran).
  const sur = surTotal === undefined ? "" : ` sur ${nombreFr(surTotal)}`
  const resume = `${uniteAccordee(nombre, unite)}${sur} ${participe("sélectionné", nombre, feminin)}`

  // Dernier élément de la barre qui a eu le focus, tant que le focus n'est
  // pas parti ailleurs : s'il disparaît, on rattrape le focus — au tableau
  // si la barre est partie avec lui, sinon à « Tout désélectionner », qui
  // reste (action retirée de `children`). « … », lui, reste monté : son menu
  // rend le focus par `finalFocus`.
  const focusDansBarre = useRef<HTMLElement | null>(null)
  const toutDeselectionner = () => {
    if (barreRef.current?.contains(document.activeElement))
      focaliserTableau(racine())
    vider()
  }
  useLayoutEffect(() => {
    const perdu = focusDansBarre.current
    // Retiré du DOM, ou masqué sur place (« … » sans rien à proposer).
    const disparu =
      !!perdu && (!perdu.isConnected || perdu.closest("[hidden]") !== null)
    if (
      !disparu ||
      (document.activeElement && document.activeElement !== document.body)
    ) {
      if (!visible) focusDansBarre.current = null
      return
    }
    focusDansBarre.current = null
    if (visible) boutonDeselectionner.current?.focus()
    else focaliserTableau(racine())
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
  // Depuis un bouton de la barre, Échap est pris avant son infobulle (la
  // croix, « … ») : elle le consommerait, et il en faudrait un second.
  const surToucheDansBarre = useEffectEvent((event: KeyboardEvent) => {
    if (event.key !== "Escape" || echapPourUnChamp(event)) return
    const cible = event.target as HTMLElement
    if (!barreRef.current?.contains(cible)) return
    // Déclencheur d'un menu ou d'un dialogue ouvert (`aria-expanded`), focus
    // encore sur lui : Échap ferme d'abord ce qu'il a ouvert. Son infobulle,
    // elle, ne compte pas.
    if (cible.getAttribute("aria-expanded") === "true") return
    event.preventDefault()
    toutDeselectionner()
  })
  useEffect(() => {
    if (!visible) return
    document.addEventListener("keydown", surToucheDansBarre, true)
    document.addEventListener("keydown", surTouche)
    return () => {
      document.removeEventListener("keydown", surToucheDansBarre, true)
      document.removeEventListener("keydown", surTouche)
    }
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
          {/* Sur mobile, le compte, « … » et « Tout désélectionner » forment
              la première ligne, les actions la suivante : la barre ne finit
              plus sur une croix seule, et les actions gardent toute leur
              ligne. L'ordre du DOM (celui de la tabulation) reste celui du
              bureau. */}
          <div className="flex flex-wrap items-center gap-1.5 max-sm:order-last max-sm:basis-full">
            {children}
          </div>
          <div className="flex items-center gap-1.5 max-sm:ml-auto">
            {/* Toujours monté avec la barre, masqué quand il n'a rien à
                proposer : démonté juste après une entrée choisie, le menu
                rendait le focus au dernier menu ou sélecteur ouvert ailleurs
                dans la page, par-dessus « Tout désélectionner ». */}
            <DropdownMenu
              onOpenChange={(ouvert) => {
                // Une entrée choisie lors d'une fermeture inachevée (barre
                // démontée entre-temps) ne vaut pas pour l'ouverture suivante.
                if (ouvert) apresFermeture.current = null
              }}
              onOpenChangeComplete={(ouvert) => {
                // L'entrée choisie n'agit qu'une fois le menu fermé et le
                // focus rendu (voir `finalFocus`).
                if (ouvert) return
                const action = apresFermeture.current
                apresFermeture.current = null
                action?.()
              }}
            >
              {/* Comme `DataTableRowActions` : infobulle, puis menu. */}
              <Tooltip>
                <TooltipTrigger
                  render={
                    <DropdownMenuTrigger
                      render={
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          aria-label="Plus d'actions"
                          hidden={!proposition && !actionsSecondaires}
                        />
                      }
                    />
                  }
                >
                  <MoreHorizontalIcon />
                </TooltipTrigger>
                <TooltipContent>Plus d'actions</TooltipContent>
              </Tooltip>
              <DropdownMenuContent
                side="top"
                align="end"
                className="w-auto"
                // « Sélectionner les 137 » choisi sans autre entrée : « … »
                // va être masqué, le focus va droit à « Tout
                // désélectionner ».
                finalFocus={() =>
                  apresFermeture.current && !actionsSecondaires
                    ? boutonDeselectionner.current
                    : true
                }
              >
                {proposition ? (
                  <DropdownMenuItem
                    onClick={() => {
                      apresFermeture.current = proposition.selectionner
                    }}
                  >
                    <ListChecksIcon />
                    {`Sélectionner les ${nombreFr(proposition.total)} ${unite.pluriel}`}
                  </DropdownMenuItem>
                ) : null}
                {proposition && actionsSecondaires ? (
                  <DropdownMenuSeparator />
                ) : null}
                {actionsSecondaires}
              </DropdownMenuContent>
            </DropdownMenu>
            <TooltipButton
              ref={boutonDeselectionner}
              variant="ghost"
              size="icon-sm"
              infobulle="Tout désélectionner"
              onClick={toutDeselectionner}
              aria-keyshortcuts="Escape"
            >
              <XIcon />
            </TooltipButton>
          </div>
        </div>
      ) : null}
    </>
  )
}
