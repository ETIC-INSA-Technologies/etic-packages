import { useMemo, useRef, type ComponentProps, type ReactNode } from "react"
import type { RowData } from "@tanstack/react-table"
import { cn } from "cn"
import { ListFilterIcon, SearchIcon, XIcon } from "lucide-react"

import { Button } from "@etic-ui/components/ui/button"
import {
  InputGroup,
  InputGroupAddon,
  InputGroupButton,
  InputGroupInput,
} from "@etic-ui/components/ui/input-group"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@etic-ui/components/ui/tooltip"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@etic-ui/components/ui/popover"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@etic-ui/components/ui/select"
import { useIsMobile } from "@etic-ui/hooks/use-mobile"
import {
  UNITE_PAR_DEFAUT,
  nombreFr,
  participe,
  uniteAccordee,
  type DataTableUnite,
} from "@etic-ui/components/etic/data-table-format"
import {
  paginationDuTableau,
  type DataTableInstance,
} from "@etic-ui/components/etic/data-table"
import { NO_AUTOFILL } from "@etic-ui/lib/autofill"

interface DataTableCountCommun {
  /** Nom des éléments. « élément », « éléments » par défaut. */
  unite?: DataTableUnite
  /** Accorde « affichées » au féminin. */
  feminin?: boolean
  className?: string
}

/** Compteur aux nombres donnés par l'application (pagination côté serveur). */
export interface DataTableCountNombresProps extends DataTableCountCommun {
  table?: never
  /** Nombre total d'éléments, toutes pages comprises. */
  total: number
  /** Rang (à partir de 0) du premier élément affiché. 0 par défaut. */
  decalage?: number
  /** Nombre d'éléments affichés. */
  nombre: number
}

/** Compteur lu dans le tableau (pagination côté client de `useDataTable`) :
 *  lignes filtrées, page courante. */
export interface DataTableCountTableProps<
  TData extends RowData = RowData,
> extends DataTableCountCommun {
  table: DataTableInstance<TData>
}

export type DataTableCountProps<TData extends RowData = RowData> =
  DataTableCountNombresProps | DataTableCountTableProps<TData>

/**
 * Compteur d'une liste : « 128 éléments · 26–50 affichés ». C'est une zone
 * de statut : après une recherche, un filtre ou un changement de page, le
 * nouveau compte est annoncé sans déplacer le focus. Avec `table`, il lit
 * les nombres de la pagination côté client.
 */
export function DataTableCount<TData extends RowData>(
  props: DataTableCountProps<TData>
) {
  const { unite = UNITE_PAR_DEFAUT, feminin = false, className } = props
  const {
    total,
    decalage = 0,
    nombre,
  } = props.table ? paginationDuTableau(props.table) : props
  const debut = decalage + 1
  const fin = decalage + nombre
  return (
    <p
      data-slot="data-table-count"
      role="status"
      aria-atomic="true"
      className={cn(
        "text-sm whitespace-nowrap text-muted-foreground",
        className
      )}
    >
      <strong className="font-medium text-foreground tabular-nums">
        {nombreFr(total)}
      </strong>{" "}
      {uniteAccordee(total, unite)}
      {nombre > 0 ? (
        <span className="tabular-nums">
          {" "}
          ·{" "}
          {fin > debut
            ? `${nombreFr(debut)}–${nombreFr(fin)}`
            : nombreFr(debut)}{" "}
          {participe("affiché", nombre, feminin)}
        </span>
      ) : null}
    </p>
  )
}

export interface DataTableSelectFilterOption {
  valeur: string
  libelle: string
}

export interface DataTableSelectFilterProps {
  /** Nom du filtre pour les lecteurs d'écran : « Filtrer par statut ». */
  libelle: string
  /** Valeur choisie ; `null` = pas de filtre. */
  valeur: string | null
  onValeurChange: (valeur: string | null) => void
  options: DataTableSelectFilterOption[]
  /** Entrée sans filtre : « Tous les statuts ». */
  libelleTous: string
  className?: string
}

/** Filtre d'une liste : un Select de shadcn dont la première entrée retire
 *  le filtre. */
export function DataTableSelectFilter({
  libelle,
  valeur,
  onValeurChange,
  options,
  libelleTous,
  className,
}: DataTableSelectFilterProps) {
  const items = useMemo(
    () => [
      { value: null, label: libelleTous },
      ...options.map((option) => ({
        value: option.valeur,
        label: option.libelle,
      })),
    ],
    [libelleTous, options]
  )
  return (
    <Select items={items} value={valeur} onValueChange={onValeurChange}>
      <SelectTrigger aria-label={libelle} className={className}>
        <SelectValue />
      </SelectTrigger>
      <SelectContent>
        {items.map((item) => (
          <SelectItem key={item.value ?? ""} value={item.value}>
            {item.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}

/** Attributs du champ de recherche que l'application peut ajouter. */
export type DataTableRechercheAttributs = Omit<
  ComponentProps<"input">,
  "value" | "defaultValue" | "onChange" | "type" | "ref"
>

export interface DataTableToolbarProps<TData extends RowData = RowData> {
  /** Champ de recherche, contrôlé (l'application temporise sa requête). */
  recherche?: {
    valeur: string
    onValeurChange: (valeur: string) => void
    placeholder?: string
    /** Nom du champ. « Rechercher » par défaut. */
    libelle?: string
    /** Attributs ajoutés au champ (`name`, `data-*`…). Le champ porte déjà
     *  `autoComplete="off"` et les attributs qui écartent les gestionnaires
     *  de mots de passe ; ils peuvent être remplacés ici. */
    attributs?: DataTableRechercheAttributs
  }
  /** Filtres : `DataTableSelectFilter`… */
  filtres?: ReactNode
  /**
   * Nombre de filtres actifs. Fourni, il replie les filtres derrière un
   * bouton « Filtres (n) » sur mobile, où ils s'empileraient sinon au-dessus
   * des résultats, et affiche « Réinitialiser » s'il y en a.
   */
  filtresActifs?: number
  /** Retire tous les filtres (bouton « Réinitialiser »). */
  onReinitialiser?: () => void
  /** Compteur « N éléments · a–b affichés » : ses nombres, ou `{ table }`
   *  pour une pagination côté client. */
  compteur?: DataTableCountProps<TData>
  /** À droite : `DataTableViewOptions`, bouton d'ajout… */
  children?: ReactNode
  className?: string
}

/**
 * Barre d'outils au-dessus d'un tableau, sur le modèle de celle de shadcn :
 * recherche et filtres à gauche, compteur et commandes (colonnes…) à droite.
 */
export function DataTableToolbar<TData extends RowData = RowData>({
  recherche,
  filtres,
  filtresActifs,
  onReinitialiser,
  compteur,
  children,
  className,
}: DataTableToolbarProps<TData>) {
  const mobile = useIsMobile()
  const replier = mobile && filtres != null && filtresActifs !== undefined
  const racineRef = useRef<HTMLDivElement>(null)
  const rechercheRef = useRef<HTMLInputElement>(null)

  // « Réinitialiser » disparaît avec les filtres : le focus passe d'abord au
  // champ de recherche, sinon au premier filtre (ou au bouton « Filtres »),
  // au lieu de tomber sur <body>.
  const reinitialiser = () => {
    racineRef.current
      ?.querySelector<HTMLElement>(
        'input[type="search"], [data-slot="popover-trigger"], [data-slot="select-trigger"]'
      )
      ?.focus()
    onReinitialiser?.()
  }

  return (
    <div
      ref={racineRef}
      data-slot="data-table-toolbar"
      className={cn("flex flex-wrap items-center gap-2", className)}
    >
      {recherche ? (
        <InputGroup className="w-full sm:w-64">
          <InputGroupAddon>
            <SearchIcon />
          </InputGroupAddon>
          <InputGroupInput
            // Une recherche n'est jamais un identifiant : sans ces attributs,
            // les gestionnaires de mots de passe y proposent une adresse.
            {...NO_AUTOFILL}
            {...recherche.attributs}
            ref={rechercheRef}
            type="search"
            aria-label={recherche.libelle ?? "Rechercher"}
            placeholder={recherche.placeholder ?? "Rechercher…"}
            value={recherche.valeur}
            onChange={(event) => recherche.onValeurChange(event.target.value)}
            // La croix native de Chrome (bleue, 14 px, absente de Firefox)
            // cède la place au bouton ci-dessous.
            className={cn(
              "[&::-webkit-search-cancel-button]:appearance-none",
              recherche.attributs?.className
            )}
          />
          {recherche.valeur ? (
            <InputGroupAddon align="inline-end">
              <Tooltip>
                <TooltipTrigger
                  render={
                    <InputGroupButton
                      size="icon-xs"
                      aria-label="Effacer la recherche"
                      onClick={() => {
                        // Le bouton disparaît : le focus revient au champ.
                        rechercheRef.current?.focus()
                        recherche.onValeurChange("")
                      }}
                    />
                  }
                >
                  <XIcon />
                </TooltipTrigger>
                <TooltipContent>Effacer la recherche</TooltipContent>
              </Tooltip>
            </InputGroupAddon>
          ) : null}
        </InputGroup>
      ) : null}
      {replier ? (
        <Popover>
          <PopoverTrigger render={<Button variant="outline" />}>
            <ListFilterIcon data-icon="inline-start" />
            Filtres{filtresActifs ? ` (${filtresActifs})` : ""}
          </PopoverTrigger>
          <PopoverContent
            align="start"
            className="w-64 *:data-[slot=select-trigger]:w-full"
          >
            {filtres}
          </PopoverContent>
        </Popover>
      ) : (
        filtres
      )}
      {filtresActifs && onReinitialiser ? (
        <Button variant="ghost" onClick={reinitialiser}>
          Réinitialiser
          <XIcon data-icon="inline-end" />
        </Button>
      ) : null}
      {compteur || children ? (
        <div className="ml-auto flex flex-wrap items-center gap-x-4 gap-y-2">
          {compteur ? <DataTableCount {...compteur} /> : null}
          {children}
        </div>
      ) : null}
    </div>
  )
}
