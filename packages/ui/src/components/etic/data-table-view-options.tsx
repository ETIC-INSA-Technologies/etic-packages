import { useId, useRef, useState } from "react"
import {
  DndContext,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
  type Announcements,
  type DragEndEvent,
  type Modifier,
  type UniqueIdentifier,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type {
  ColumnOrderState,
  ColumnVisibilityState,
  OnChangeFn,
  RowData,
} from "@tanstack/react-table"
import { cn } from "cn"
import { Columns3Icon, GripVerticalIcon } from "lucide-react"

import { Button, buttonVariants } from "@etic-ui/components/ui/button"
import { Checkbox } from "@etic-ui/components/ui/checkbox"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverHeader,
  PopoverTitle,
  PopoverTrigger,
} from "@etic-ui/components/ui/popover"
import {
  CASE_VERROUILLEE,
  libelleColonne,
  type DataTableInstance,
} from "@etic-ui/components/etic/data-table"
import { ordonner, replacer } from "@etic-ui/lib/ordre-colonnes"

/** Colonnes qui ne portent pas de données : cases de sélection
 *  (`dataTableSelectionColumn`), dépliage (`dataTableExpandColumn`) et menu
 *  des actions de ligne (`id: "actions"`, comme dans shadcn). */
const COLONNES_DE_STRUCTURE = new Set(["select", "expand", "actions"])

const verticalSeulement: Modifier = ({ transform }) => ({ ...transform, x: 0 })

const INSTRUCTIONS = {
  draggable:
    "Pour déplacer une colonne, appuyez sur Espace ou Entrée, déplacez-la avec les flèches haut et bas, puis appuyez de nouveau sur Espace ou Entrée pour la déposer, ou sur Échap pour annuler.",
}

/** Une colonne du sélecteur sans `useDataTable` (tableau rendu à la main). */
export interface DataTableViewOptionsColonne {
  id: string
  /** Nom affiché dans le panneau. */
  libelle: string
  /** `false` : toujours affichée, absente du panneau, à sa place (comme
   *  `enableHiding: false`). Vrai par défaut. */
  masquable?: boolean
}

interface DataTableViewOptionsCommun {
  /** Texte du bouton. « Colonnes » par défaut. */
  libelle?: string
  className?: string
}

/** Sélecteur branché sur l'instance d'un `DataTable`. */
export interface DataTableViewOptionsTableProps<
  TData extends RowData,
> extends DataTableViewOptionsCommun {
  table: DataTableInstance<TData>
}

/**
 * Sélecteur d'un tableau rendu à la main (primitives `Table`), sans
 * instance `useDataTable` : les colonnes, leur visibilité et leur ordre
 * viennent de l'application. Les noms sont ceux des options de
 * `useDataTable` : `{...prefs.optionsTableau}` de `useColumnPrefs` s'y
 * étale tel quel.
 */
export interface DataTableViewOptionsColonnesProps extends DataTableViewOptionsCommun {
  table?: never
  colonnes: readonly DataTableViewOptionsColonne[]
  /** `{ [id]: false }` pour une colonne masquée ; absente = affichée. */
  visibiliteColonnes: ColumnVisibilityState
  onVisibiliteColonnesChange: OnChangeFn<ColumnVisibilityState>
  /** Identifiants dans l'ordre d'affichage (les inconnus sont ignorés) ;
   *  l'ordre de `colonnes` sinon. */
  ordreColonnes?: ColumnOrderState
  /** Ordre complet après un déplacement. Sans lui, les colonnes ne se
   *  réordonnent pas (pas de poignée). */
  onOrdreColonnesChange?: OnChangeFn<ColumnOrderState>
}

export type DataTableViewOptionsProps<TData extends RowData = RowData> =
  DataTableViewOptionsTableProps<TData> | DataTableViewOptionsColonnesProps

/** Ce que le panneau sait d'une colonne, quelle que soit sa source. */
interface ColonneVue {
  id: string
  libelle: string
  masquable: boolean
  visible: boolean
  /** Porte des données (ni case, ni chevron, ni actions) : compte pour « la
   *  dernière colonne affichée ». */
  donnees: boolean
}

interface ModeleVue {
  /** Toutes les colonnes, dans l'ordre d'affichage. */
  toutes: ColonneVue[]
  changerVisibilite: (id: string, visible: boolean) => void
  /** Ordre complet de toutes les colonnes ; absent : pas de déplacement. */
  changerOrdre?: (ordre: string[]) => void
}

function modeleDuTableau<TData extends RowData>(
  table: DataTableInstance<TData>
): ModeleVue {
  return {
    toutes: table.getAllLeafColumns().map((colonne) => ({
      id: colonne.id,
      libelle: libelleColonne(colonne),
      masquable: colonne.getCanHide(),
      visible: colonne.getIsVisible(),
      // Colonne de données : à accesseur, ou de rendu (`display`) masquable ;
      // jamais la sélection, le dépliage ni les actions de ligne.
      donnees:
        !COLONNES_DE_STRUCTURE.has(colonne.id) &&
        (!!colonne.accessorFn || colonne.getCanHide()),
    })),
    changerVisibilite: (id, visible) =>
      table.getColumn(id)?.toggleVisibility(visible),
    changerOrdre: (ordre) => table.setColumnOrder(ordre),
  }
}

function modeleDesColonnes({
  colonnes,
  visibiliteColonnes,
  onVisibiliteColonnesChange,
  ordreColonnes,
  onOrdreColonnesChange,
}: DataTableViewOptionsColonnesProps): ModeleVue {
  const parId = new Map(colonnes.map((colonne) => [colonne.id, colonne]))
  const ids = ordonner(
    ordreColonnes,
    colonnes.map((colonne) => colonne.id)
  )
  return {
    toutes: ids.map((id) => {
      const colonne = parId.get(id)!
      const masquable = colonne.masquable ?? true
      return {
        id,
        libelle: colonne.libelle,
        masquable,
        visible: !masquable || visibiliteColonnes[id] !== false,
        donnees: !COLONNES_DE_STRUCTURE.has(id),
      }
    }),
    changerVisibilite: (id, visible) =>
      onVisibiliteColonnesChange({ ...visibiliteColonnes, [id]: visible }),
    changerOrdre: onOrdreColonnesChange,
  }
}

/**
 * Sélecteur de colonnes : le bouton « Colonnes » de shadcn, dont le panneau
 * coche les colonnes affichées et les réordonne par glisser-déposer (dnd-kit),
 * à la souris, au toucher ou au clavier (poignée : Espace, flèches, Espace).
 * Les colonnes qui ne se masquent pas (`enableHiding: false`) n'y figurent
 * pas et gardent leur place. Le panneau reste ouvert pendant les réglages.
 *
 * Avec `table`, il règle un `DataTable` ; avec `colonnes`, `visibilite` et
 * `ordre`, un tableau rendu à la main, sans instance `useDataTable`.
 */
export function DataTableViewOptions<TData extends RowData>(
  props: DataTableViewOptionsProps<TData>
) {
  const { libelle = "Colonnes", className } = props
  const modele = props.table
    ? modeleDuTableau(props.table)
    : modeleDesColonnes(props)
  const [ouvert, setOuvert] = useState(false)
  // Échap annule un glisser au clavier : il ne doit pas aussi fermer le panneau.
  const glisseRef = useRef(false)
  const listeRef = useRef<HTMLUListElement>(null)
  const capteurs = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 4 } }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  )

  const { toutes, changerVisibilite, changerOrdre } = modele
  const colonnes = toutes.filter((colonne) => colonne.masquable)
  const ids = colonnes.map((colonne) => colonne.id)
  // La dernière colonne de données affichée ne se masque pas : il ne
  // resterait que les cases et les menus, un tableau vide en apparence.
  const donneesVisibles = toutes.filter(
    (colonne) => colonne.visible && colonne.donnees
  )
  const derniere =
    donneesVisibles.length === 1 && donneesVisibles[0].masquable
      ? donneesVisibles[0].id
      : undefined
  const idVerrou = useId()
  const nom = (id: UniqueIdentifier) =>
    colonnes.find((c) => c.id === id)?.libelle ?? String(id)
  const position = (id: UniqueIdentifier) =>
    `${ids.indexOf(String(id)) + 1} sur ${ids.length}`

  const annonces: Announcements = {
    onDragStart: ({ active }) =>
      `Colonne ${nom(active.id)} saisie, position ${position(active.id)}.`,
    onDragOver: ({ active, over }) =>
      over
        ? `Colonne ${nom(active.id)} déplacée en position ${position(over.id)}.`
        : undefined,
    onDragEnd: ({ active, over }) =>
      over
        ? `Colonne ${nom(active.id)} déposée en position ${position(over.id)}.`
        : `Colonne ${nom(active.id)} déposée.`,
    onDragCancel: ({ active }) =>
      `Déplacement annulé : la colonne ${nom(active.id)} reprend sa place.`,
  }

  function finirGlisser() {
    // Laisse passer l'Échap en cours avant de rendre la main au panneau.
    setTimeout(() => {
      glisseRef.current = false
    })
  }

  function deposer({ active, over }: DragEndEvent) {
    finirGlisser()
    if (!changerOrdre || !over || active.id === over.id) return
    const nouvelOrdre = arrayMove(
      ids,
      ids.indexOf(String(active.id)),
      ids.indexOf(String(over.id))
    )
    // Les colonnes fixes (sélection, actions…) gardent leur place.
    const deplacables = new Set(ids)
    changerOrdre(
      replacer(
        toutes.map((colonne) => colonne.id),
        (id) => deplacables.has(id),
        nouvelOrdre
      )
    )
  }

  const elements = colonnes.map((colonne) => (
    <ElementColonne
      key={colonne.id}
      id={colonne.id}
      libelle={colonne.libelle}
      visible={colonne.visible}
      deplacable={changerOrdre !== undefined}
      onVisibleChange={(visible) => changerVisibilite(colonne.id, visible)}
      verrou={colonne.id === derniere ? idVerrou : undefined}
    />
  ))

  return (
    <Popover
      open={ouvert}
      onOpenChange={(suivant, details) => {
        if (!suivant && glisseRef.current) {
          // Échap revient à dnd-kit (qui l'écoute sur window) pour annuler
          // le glisser ; le panneau reste ouvert.
          details.allowPropagation()
          return
        }
        setOuvert(suivant)
      }}
    >
      <PopoverTrigger
        render={<Button variant="outline" className={cn("h-8", className)} />}
      >
        <Columns3Icon data-icon="inline-start" />
        {libelle}
      </PopoverTrigger>
      <PopoverContent
        align="end"
        className="w-64 gap-1 p-1"
        // La première case plutôt que la première poignée : cocher est le
        // geste courant, et une poignée n'est utile qu'au glisser.
        initialFocus={() =>
          listeRef.current?.querySelector<HTMLElement>('[role="checkbox"]') ??
          true
        }
      >
        <PopoverHeader className="px-2 pt-1.5 pb-1">
          <PopoverTitle className="text-sm font-medium">
            Colonnes affichées
          </PopoverTitle>
          <PopoverDescription className="text-xs">
            {changerOrdre
              ? "Cochez pour afficher, glissez pour réordonner."
              : "Cochez pour afficher."}
          </PopoverDescription>
        </PopoverHeader>
        {changerOrdre ? (
          <DndContext
            sensors={capteurs}
            collisionDetection={closestCenter}
            modifiers={[verticalSeulement]}
            accessibility={{
              announcements: annonces,
              screenReaderInstructions: INSTRUCTIONS,
            }}
            onDragStart={() => {
              glisseRef.current = true
            }}
            onDragEnd={deposer}
            onDragCancel={finirGlisser}
          >
            <SortableContext items={ids} strategy={verticalListSortingStrategy}>
              <ul ref={listeRef} className={LISTE}>
                {elements}
              </ul>
            </SortableContext>
          </DndContext>
        ) : (
          <ul ref={listeRef} className={LISTE}>
            {elements}
          </ul>
        )}
        {derniere ? (
          <p id={idVerrou} className="px-2 pb-1 text-xs text-muted-foreground">
            Au moins une colonne reste affichée.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

const LISTE = "flex max-h-80 flex-col overflow-y-auto"

function ElementColonne({
  deplacable,
  ...props
}: ElementColonneProps & { deplacable: boolean }) {
  return deplacable ? (
    <ElementDeplacable {...props} />
  ) : (
    // Sans poignée, la case prend sa place à gauche.
    <li className={cn(ELEMENT, "pl-2")}>
      <CaseColonne {...props} />
    </li>
  )
}

interface ElementColonneProps {
  id: string
  libelle: string
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  /** Id du texte qui dit pourquoi la case ne se décoche pas. */
  verrou?: string
}

const ELEMENT =
  "flex items-center gap-1 rounded-md bg-popover pr-2 hover:bg-muted data-dragging:relative data-dragging:z-10 data-dragging:shadow-md"

function ElementDeplacable(props: ElementColonneProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: props.id,
    attributes: { roleDescription: "colonne déplaçable" },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging || undefined}
      className={ELEMENT}
    >
      {/* Sans infobulle : ouverte au focus, elle prenait pour elle le premier
          Échap, qui ne fermait plus le panneau. L'en-tête du panneau dit
          déjà « glissez pour réordonner ». */}
      <button
        type="button"
        ref={setActivatorNodeRef}
        className={cn(
          buttonVariants({ variant: "ghost", size: "icon-xs" }),
          "cursor-grab touch-none text-muted-foreground active:cursor-grabbing"
        )}
        aria-label={`Déplacer la colonne ${props.libelle}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon />
      </button>
      <CaseColonne {...props} />
    </li>
  )
}

function CaseColonne({
  libelle,
  visible,
  onVisibleChange,
  verrou,
}: ElementColonneProps) {
  return (
    <label className="flex flex-1 cursor-pointer items-center gap-2 py-1.5 text-sm has-aria-disabled:cursor-not-allowed">
      <Checkbox
        checked={visible}
        onCheckedChange={onVisibleChange}
        readOnly={verrou !== undefined}
        aria-disabled={verrou !== undefined || undefined}
        aria-describedby={verrou}
        className={CASE_VERROUILLEE}
      />
      {libelle}
    </label>
  )
}
