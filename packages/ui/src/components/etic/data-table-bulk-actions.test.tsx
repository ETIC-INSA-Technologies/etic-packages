import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  DataTable,
  DataTableBulkActions,
  DataTableRowActions,
  Dialog,
  DialogContent,
  DialogTitle,
  DialogTrigger,
  DropdownMenuItem,
  createDataTableColumnHelper,
  dataTableSelectionColumn,
  useDataTable,
  type DataTableColumnDef,
} from "@etic-ui/index"

interface Ligne {
  id: string
  nom: string
}

const aide = createDataTableColumnHelper<Ligne>()
const COLONNES = aide.columns([
  dataTableSelectionColumn<Ligne>({
    libelleLigne: (l) => `Sélectionner ${l.nom}`,
  }),
  aide.accessor("nom", { header: "Nom" }),
])
const DONNEES: Ligne[] = [
  { id: "1", nom: "Ada" },
  { id: "2", nom: "Grace" },
]

function Liste({
  supprimer,
  total,
  donnees = DONNEES,
  onToutSelectionneChange,
  conserverSelection,
}: {
  supprimer: (ids: string[]) => void
  total?: number
  donnees?: Ligne[]
  onToutSelectionneChange?: (tout: boolean) => void
  conserverSelection?: boolean
}) {
  const [tout, setTout] = useState(false)
  const table = useDataTable({
    donnees,
    colonnes: COLONNES,
    idLigne: (l) => l.id,
    conserverSelection,
    total,
    toutSelectionne: tout,
    onToutSelectionneChange: (valeur) => {
      setTout(valeur)
      onToutSelectionneChange?.(valeur)
    },
  })
  return (
    <>
      <input aria-label="Recherche" />
      <button type="button">Ailleurs</button>
      <DataTable
        table={table}
        libelle="Personnes"
        unite={{ singulier: "personne", pluriel: "personnes" }}
        feminin
      />
      <DataTableBulkActions
        table={table}
        unite={{ singulier: "personne", pluriel: "personnes" }}
        feminin
      >
        <Button
          size="sm"
          variant="destructive"
          onClick={() => supprimer(table.getSelectedRowIds())}
        >
          Supprimer
        </Button>
      </DataTableBulkActions>
    </>
  )
}

/** « Tout désélectionner » du bandeau au-dessus des lignes (la barre a le
 *  sien, au même nom : une seule action, un seul mot). */
const boutonDuBandeau = () =>
  within(
    document.querySelector<HTMLElement>('[data-slot="data-table-select-all"]')!
  ).getByRole("button", { name: "Tout désélectionner" })

const caseEntete = () =>
  screen.getByRole("checkbox", { name: "Sélectionner la page" })

/** Zone annoncée de la barre (montée en permanence). */
const annonce = () =>
  document.querySelector('[data-slot="data-table-bulk-actions-status"]')

/** Bouton « Tout désélectionner » de la barre d'actions. */
const boutonDeLaBarre = () =>
  within(screen.getByRole("toolbar")).getByRole("button", {
    name: "Tout désélectionner",
  })

describe("DataTableBulkActions", () => {
  it("apparaît avec la sélection, l'annonce et porte les actions", async () => {
    const user = userEvent.setup()
    const supprimer = vi.fn()
    render(<Liste supprimer={supprimer} />)
    expect(screen.queryByRole("toolbar")).toBeNull()

    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    expect(
      screen.getByRole("toolbar", { name: "1 personne sélectionnée" })
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Grace" })
    )
    const barre = screen.getByRole("toolbar", {
      name: "2 personnes sélectionnées",
    })
    expect(barre).toBeInTheDocument()
    expect(annonce()).toHaveTextContent("2 personnes sélectionnées")

    await user.click(screen.getByRole("button", { name: "Supprimer" }))
    expect(supprimer).toHaveBeenCalledWith(["1", "2"])

    // Le raccourci est annoncé, pas affiché : aucune touche « Échap » dans la
    // barre.
    expect(boutonDeLaBarre()).toHaveAttribute("aria-keyshortcuts", "Escape")
    expect(barre).not.toHaveTextContent("Échap")

    await user.click(boutonDeLaBarre())
    expect(screen.queryByRole("toolbar")).toBeNull()
    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Ada" })
    ).not.toBeChecked()
    // La barre a disparu avec le focus : il passe à la case d'en-tête, et
    // l'effacement est dit.
    expect(document.activeElement).toBe(caseEntete())
    expect(annonce()).toHaveTextContent("Sélection effacée")
  })

  it("Échap désélectionne depuis le tableau ou la barre, pas depuis un champ ni d'ailleurs", async () => {
    const user = userEvent.setup()
    render(<Liste supprimer={vi.fn()} />)
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))

    await user.click(screen.getByRole("textbox", { name: "Recherche" }))
    await user.keyboard("{Escape}")
    expect(screen.getByRole("toolbar")).toBeInTheDocument()

    // Hors du tableau (navigation, autre bouton de la page) : rien.
    screen.getByRole("button", { name: "Ailleurs" }).focus()
    await user.keyboard("{Escape}")
    expect(screen.getByRole("toolbar")).toBeInTheDocument()

    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Grace" })
    )
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("toolbar")).toBeNull()
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: "Sélectionner Grace" })
    )
  })

  it("Échap depuis une action de la barre rend le focus au tableau", async () => {
    const user = userEvent.setup()
    render(<Liste supprimer={vi.fn()} />)
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    screen.getByRole("button", { name: "Supprimer" }).focus()
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("toolbar")).toBeNull()
    expect(document.activeElement).toBe(caseEntete())
  })

  it("une action qui vide la sélection rend le focus au tableau", async () => {
    const user = userEvent.setup()
    function Suppression() {
      const [donnees, setDonnees] = useState(DONNEES)
      const table = useDataTable({
        donnees,
        colonnes: COLONNES,
        idLigne: (l) => l.id,
      })
      return (
        <>
          <DataTable table={table} libelle="Personnes" />
          <DataTableBulkActions table={table}>
            <Button
              size="sm"
              onClick={() => {
                const ids = table.getSelectedRowIds()
                setDonnees((avant) => avant.filter((l) => !ids.includes(l.id)))
              }}
            >
              Supprimer
            </Button>
          </DataTableBulkActions>
        </>
      )
    }
    render(<Suppression />)
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    await user.click(screen.getByRole("button", { name: "Supprimer" }))
    expect(screen.queryByRole("toolbar")).toBeNull()
    expect(screen.getAllByRole("row")).toHaveLength(2)
    expect(document.activeElement).toBe(caseEntete())
  })

  it("Échap ferme un menu ou un dialogue ouvert sans vider la sélection", async () => {
    const user = userEvent.setup()
    const colonnes = [
      ...COLONNES,
      aide.display({
        id: "actions",
        cell: ({ row }) => (
          <DataTableRowActions libelle={`Actions pour ${row.original.nom}`}>
            <DropdownMenuItem>Modifier</DropdownMenuItem>
          </DataTableRowActions>
        ),
      }),
    ] as DataTableColumnDef<Ligne>[]
    function AvecMenuEtDialogue() {
      const table = useDataTable({
        donnees: DONNEES,
        colonnes,
        idLigne: (l) => l.id,
      })
      return (
        <>
          <DataTable table={table} libelle="Personnes" />
          <DataTableBulkActions table={table}>
            <Dialog>
              <DialogTrigger render={<Button size="sm" />}>
                Archiver
              </DialogTrigger>
              <DialogContent>
                <DialogTitle>Archiver la sélection</DialogTitle>
              </DialogContent>
            </Dialog>
          </DataTableBulkActions>
        </>
      )
    }
    render(<AvecMenuEtDialogue />)
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))

    await user.click(screen.getByRole("button", { name: "Actions pour Grace" }))
    await screen.findByRole("menu")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("menu")).toBeNull()
    expect(screen.getByRole("toolbar")).toBeInTheDocument()

    await user.click(screen.getByRole("button", { name: "Archiver" }))
    await screen.findByRole("dialog")
    await user.keyboard("{Escape}")
    expect(screen.queryByRole("dialog")).toBeNull()
    expect(screen.getByRole("toolbar")).toBeInTheDocument()
  })
})

describe("sélection de tous les éléments", () => {
  it("propose, une fois la page cochée, de sélectionner tout le total", async () => {
    const user = userEvent.setup()
    const onTout = vi.fn()
    render(
      <Liste supprimer={vi.fn()} total={137} onToutSelectionneChange={onTout} />
    )
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    // Page incomplète : pas de proposition.
    expect(screen.queryByText(/de la page/)).toBeNull()

    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner la page" })
    )
    expect(
      screen.getByText("Les 2 personnes de la page sont sélectionnées.")
    ).toBeInTheDocument()

    await user.click(
      screen.getByRole("button", { name: "Sélectionner les 137 personnes" })
    )
    expect(onTout).toHaveBeenLastCalledWith(true)
    // Affiché dans le bandeau, et annoncé : le bouton reste le même, seul
    // son texte change, rien ne l'aurait dit.
    const [zoneAnnoncee, bandeau] = screen.getAllByText(
      "Les 137 personnes sont sélectionnées."
    )
    expect(
      bandeau.closest('[data-slot="data-table-select-all"]')
    ).not.toBeNull()
    expect(zoneAnnoncee).toHaveAttribute("aria-live", "polite")
    expect(document.activeElement).toBe(boutonDuBandeau())
    expect(
      screen.getByRole("toolbar", { name: "137 personnes sélectionnées" })
    ).toBeInTheDocument()

    await user.click(boutonDuBandeau())
    expect(onTout).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole("toolbar")).toBeNull()
    // Le bandeau a disparu sous le focus : il passe à la case d'en-tête.
    expect(
      document.querySelector('[data-slot="data-table-select-all"]')
    ).toBeNull()
    expect(document.activeElement).toBe(caseEntete())
  })

  it("prend fin quand une ligne est décochée, ou par « Tout désélectionner »", async () => {
    const user = userEvent.setup()
    const onTout = vi.fn()
    render(
      <Liste supprimer={vi.fn()} total={137} onToutSelectionneChange={onTout} />
    )
    const toutCocher = async () => {
      await user.click(
        screen.getByRole("checkbox", { name: "Sélectionner la page" })
      )
      await user.click(
        screen.getByRole("button", { name: "Sélectionner les 137 personnes" })
      )
    }

    await toutCocher()
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    expect(onTout).toHaveBeenLastCalledWith(false)
    expect(
      screen.getByRole("toolbar", { name: "1 personne sélectionnée" })
    ).toBeInTheDocument()

    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    await user.click(
      screen.getByRole("button", { name: "Sélectionner les 137 personnes" })
    )
    await user.click(boutonDeLaBarre())
    expect(onTout).toHaveBeenLastCalledWith(false)
    expect(screen.queryByText(/sélectionnées\./)).toBeNull()
  })

  it("prend fin quand la page change", async () => {
    const user = userEvent.setup()
    const onTout = vi.fn()
    const { rerender } = render(
      <Liste supprimer={vi.fn()} total={137} onToutSelectionneChange={onTout} />
    )
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner la page" })
    )
    await user.click(
      screen.getByRole("button", { name: "Sélectionner les 137 personnes" })
    )
    rerender(
      <Liste
        supprimer={vi.fn()}
        total={137}
        donnees={[{ id: "3", nom: "Alan" }]}
        onToutSelectionneChange={onTout}
      />
    )
    expect(onTout).toHaveBeenLastCalledWith(false)
    expect(screen.queryByRole("toolbar")).toBeNull()
  })

  it("prend fin au changement de page même en conservant la sélection", async () => {
    const user = userEvent.setup()
    const onTout = vi.fn()
    const PAGE_2 = [
      { id: "3", nom: "Alan" },
      { id: "4", nom: "Barbara" },
    ]
    const { rerender } = render(
      <Liste
        supprimer={vi.fn()}
        total={137}
        conserverSelection
        onToutSelectionneChange={onTout}
      />
    )
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner la page" })
    )
    await user.click(
      screen.getByRole("button", { name: "Sélectionner les 137 personnes" })
    )
    rerender(
      <Liste
        supprimer={vi.fn()}
        total={137}
        conserverSelection
        donnees={PAGE_2}
        onToutSelectionneChange={onTout}
      />
    )
    expect(onTout).toHaveBeenLastCalledWith(false)

    // Cocher la page 2 ne vaut pas « les 137 » : il faut le redemander.
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner la page" })
    )
    expect(
      screen.getByText("Les 2 personnes de la page sont sélectionnées.")
    ).toBeInTheDocument()
    expect(
      screen.getByRole("toolbar", { name: "4 personnes sélectionnées" })
    ).toBeInTheDocument()
  })

  it("signale une seule fois la fin de « tous sélectionnés » à l'effacement", async () => {
    const user = userEvent.setup()
    const onTout = vi.fn()
    render(
      <Liste supprimer={vi.fn()} total={137} onToutSelectionneChange={onTout} />
    )
    const toutCocher = async () => {
      await user.click(
        screen.getByRole("checkbox", { name: "Sélectionner la page" })
      )
      await user.click(
        screen.getByRole("button", { name: "Sélectionner les 137 personnes" })
      )
      onTout.mockClear()
    }

    await toutCocher()
    await user.click(boutonDeLaBarre())
    expect(onTout.mock.calls).toEqual([[false]])

    await toutCocher()
    await user.click(boutonDuBandeau())
    expect(onTout.mock.calls).toEqual([[false]])
  })

  it("prend fin quand l'application remplace la sélection contrôlée", async () => {
    const user = userEvent.setup()
    const onTout = vi.fn()
    function Controlee() {
      const [selection, setSelection] = useState({})
      const [tout, setTout] = useState(false)
      const table = useDataTable({
        donnees: DONNEES,
        colonnes: COLONNES,
        idLigne: (l) => l.id,
        selection,
        onSelectionChange: setSelection,
        total: 137,
        toutSelectionne: tout,
        onToutSelectionneChange: (v) => {
          setTout(v)
          onTout(v)
        },
      })
      return (
        <>
          <button type="button" onClick={() => setSelection({ "1": true })}>
            Garder Ada
          </button>
          <DataTable table={table} libelle="Personnes" />
        </>
      )
    }
    render(<Controlee />)
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner la page" })
    )
    await user.click(
      screen.getByRole("button", { name: "Sélectionner les 137 éléments" })
    )
    expect(onTout).toHaveBeenLastCalledWith(true)
    await user.click(screen.getByRole("button", { name: "Garder Ada" }))
    expect(onTout).toHaveBeenLastCalledWith(false)

    // Recocher la page ne rétablit pas « les 137 » à l'insu de l'utilisateur.
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Grace" })
    )
    expect(
      screen.getByText("Les 2 éléments de la page sont sélectionnés.")
    ).toBeInTheDocument()
  })

  it("ne propose rien sans total, ni quand la page contient tout", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Liste supprimer={vi.fn()} />)
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner la page" })
    )
    expect(screen.queryByText(/de la page/)).toBeNull()
    rerender(<Liste supprimer={vi.fn()} total={2} />)
    expect(screen.queryByText(/de la page/)).toBeNull()
  })
})
