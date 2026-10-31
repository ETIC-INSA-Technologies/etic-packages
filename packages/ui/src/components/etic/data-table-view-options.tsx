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
import type { Column, RowData } from "@tanstack/react-table"
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
import type {
  DataTableFeatures,
  DataTableInstance,
} from "@etic-ui/components/etic/data-table"

type Colonne<TData extends RowData> = Column<DataTableFeatures, TData, unknown>

/** Nom d'une colonne : `meta.libelle`, sinon son en-tête s'il est un texte,
 *  sinon son identifiant. */
function libelleDe<TData extends RowData>(colonne: Colonne<TData>): string {
  const { meta, header } = colonne.columnDef
  if (meta?.libelle) return meta.libelle
  return typeof header === "string" ? header : colonne.id
}

/** Ordre complet des colonnes quand celles du sélecteur prennent l'ordre
 *  `deplacables` : les colonnes fixes (sélection, actions…) gardent leur
 *  place. */
function fusionnerOrdre(
  toutes: string[],
  deplacables: Set<string>,
  nouvelOrdre: string[]
): string[] {
  const suivantes = nouvelOrdre[Symbol.iterator]()
  return toutes.map((id) =>
    deplacables.has(id) ? (suivantes.next().value as string) : id
  )
}

/** Colonnes qui ne portent pas de données : cases de sélection
 *  (`dataTableSelectionColumn`), dépliage (`dataTableExpandColumn`) et menu
 *  des actions de ligne (`id: "actions"`, comme dans shadcn). */
const COLONNES_DE_STRUCTURE = new Set(["select", "expand", "actions"])

const verticalSeulement: Modifier = ({ transform }) => ({ ...transform, x: 0 })

const INSTRUCTIONS = {
  draggable:
    "Pour déplacer une colonne, appuyez sur Espace ou Entrée, déplacez-la avec les flèches haut et bas, puis appuyez de nouveau sur Espace ou Entrée pour la déposer, ou sur Échap pour annuler.",
}

export interface DataTableViewOptionsProps<TData extends RowData> {
  table: DataTableInstance<TData>
  /** Texte du bouton. « Colonnes » par défaut. */
  libelle?: string
  className?: string
}

/**
 * Sélecteur de colonnes : le bouton « Colonnes » de shadcn, dont le panneau
 * coche les colonnes affichées et les réordonne par glisser-déposer (dnd-kit),
 * à la souris, au toucher ou au clavier (poignée : Espace, flèches, Espace).
 * Les colonnes qui ne se masquent pas (`enableHiding: false`) n'y figurent
 * pas et gardent leur place. Le panneau reste ouvert pendant les réglages.
 */
export function DataTableViewOptions<TData extends RowData>({
  table,
  libelle = "Colonnes",
  className,
}: DataTableViewOptionsProps<TData>) {
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

  const toutes = table.getAllLeafColumns()
  const colonnes = toutes.filter((colonne) => colonne.getCanHide())
  const ids = colonnes.map((colonne) => colonne.id)
  // La dernière colonne de données affichée ne se masque pas : il ne
  // resterait que les cases et les menus, un tableau vide en apparence.
  // Colonne de données : à accesseur, ou de rendu (`display`) masquable ;
  // jamais la sélection, le dépliage ni les actions de ligne.
  const donneesVisibles = toutes.filter(
    (colonne) =>
      colonne.getIsVisible() &&
      !COLONNES_DE_STRUCTURE.has(colonne.id) &&
      (colonne.accessorFn || colonne.getCanHide())
  )
  const derniere =
    donneesVisibles.length === 1 && donneesVisibles[0].getCanHide()
      ? donneesVisibles[0].id
      : undefined
  const idVerrou = useId()
  const nom = (id: UniqueIdentifier) => {
    const colonne = colonnes.find((c) => c.id === id)
    return colonne ? libelleDe(colonne) : String(id)
  }
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
    if (!over || active.id === over.id) return
    const nouvelOrdre = arrayMove(
      ids,
      ids.indexOf(String(active.id)),
      ids.indexOf(String(over.id))
    )
    table.setColumnOrder(
      fusionnerOrdre(
        toutes.map((colonne) => colonne.id),
        new Set(ids),
        nouvelOrdre
      )
    )
  }

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
            Cochez pour afficher, glissez pour réordonner.
          </PopoverDescription>
        </PopoverHeader>
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
            <ul
              ref={listeRef}
              className="flex max-h-80 flex-col overflow-y-auto"
            >
              {colonnes.map((colonne) => (
                <ElementColonne
                  key={colonne.id}
                  id={colonne.id}
                  libelle={libelleDe(colonne)}
                  visible={colonne.getIsVisible()}
                  onVisibleChange={(visible) =>
                    colonne.toggleVisibility(visible)
                  }
                  verrou={colonne.id === derniere ? idVerrou : undefined}
                />
              ))}
            </ul>
          </SortableContext>
        </DndContext>
        {derniere ? (
          <p id={idVerrou} className="px-2 pb-1 text-xs text-muted-foreground">
            Au moins une colonne reste affichée.
          </p>
        ) : null}
      </PopoverContent>
    </Popover>
  )
}

function ElementColonne({
  id,
  libelle,
  visible,
  onVisibleChange,
  verrou,
}: {
  id: string
  libelle: string
  visible: boolean
  onVisibleChange: (visible: boolean) => void
  /** Id du texte qui dit pourquoi la case ne se décoche pas. */
  verrou?: string
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id,
    attributes: { roleDescription: "colonne déplaçable" },
  })

  return (
    <li
      ref={setNodeRef}
      style={{ transform: CSS.Translate.toString(transform), transition }}
      data-dragging={isDragging || undefined}
      className="flex items-center gap-1 rounded-md bg-popover pr-2 hover:bg-muted data-dragging:relative data-dragging:z-10 data-dragging:shadow-md"
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
        aria-label={`Déplacer la colonne ${libelle}`}
        {...attributes}
        {...listeners}
      >
        <GripVerticalIcon />
      </button>
      <label className="flex flex-1 cursor-pointer items-center gap-2 py-1.5 text-sm has-aria-disabled:cursor-not-allowed">
        <Checkbox
          checked={visible}
          onCheckedChange={onVisibleChange}
          readOnly={verrou !== undefined}
          aria-disabled={verrou !== undefined || undefined}
          aria-describedby={verrou}
          className="aria-disabled:opacity-50"
        />
        {libelle}
      </label>
    </li>
  )
}
