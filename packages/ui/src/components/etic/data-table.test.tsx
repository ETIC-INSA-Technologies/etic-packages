import { render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState, type ReactNode } from "react"
import { describe, expect, it, vi } from "vitest"

import {
  DataTable,
  DataTableColumnHeader,
  DataTableRowActions,
  DropdownMenuItem,
  createDataTableColumnHelper,
  dataTableExpandColumn,
  dataTableSelectionColumn,
  useDataTable,
  type DataTableColumnDef,
  type SortingState,
  type UseDataTableOptions,
} from "@etic-ui/index"

interface Personne {
  id: string
  nom: string
  ville: string
}

const PERSONNES: Personne[] = [
  { id: "1", nom: "Ada", ville: "Lyon" },
  { id: "2", nom: "Grace", ville: "Paris" },
  { id: "3", nom: "Alan", ville: "Rennes" },
  { id: "4", nom: "Edsger", ville: "Toulouse" },
  { id: "5", nom: "Barbara", ville: "Lyon" },
]

const aide = createDataTableColumnHelper<Personne>()
const COLONNES = aide.columns([
  dataTableSelectionColumn<Personne>({
    libelleLigne: (p) => `Sélectionner ${p.nom}`,
    verrouLigne: (p) => (p.id === "4" ? "Ce compte est protégé." : undefined),
  }),
  aide.accessor("nom", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="Nom" />
    ),
    meta: { libelle: "Nom" },
  }),
  aide.accessor("ville", { header: "Ville", enableSorting: false }),
])

type Options = Partial<UseDataTableOptions<Personne>> & {
  onActiverLigne?: (p: Personne) => void
  enChargement?: boolean
  rendreDetail?: (p: Personne) => ReactNode
}

function Tableau({
  onActiverLigne,
  enChargement,
  rendreDetail,
  ...options
}: Options) {
  const table = useDataTable({
    donnees: PERSONNES,
    colonnes: COLONNES,
    idLigne: (p) => p.id,
    ligneSelectionnable: (p) => p.id !== "4",
    ...options,
  })
  return (
    <>
      <output data-testid="selection">
        {table.getSelectedRowIds().sort().join(",")}
      </output>
      <DataTable
        table={table}
        libelle="Personnes"
        onActiverLigne={onActiverLigne}
        enChargement={enChargement}
        rendreDetail={rendreDetail}
      />
    </>
  )
}

/** Identifiants sélectionnés, triés. */
const selection = () =>
  screen.getByTestId("selection").textContent!.split(",").filter(Boolean)

const nomsAffiches = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((ligne) => within(ligne).getAllByRole("cell")[1].textContent)

/** Zone annoncée du tableau (tri, chargement, tous sélectionnés). */
const annonceTableau = () =>
  document.querySelector('[data-slot="data-table"] > [aria-live="polite"]')

describe("DataTable", () => {
  it("trie en un clic, inverse au suivant, et annonce le tri choisi", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    const entete = screen.getByRole("columnheader", { name: /Nom/ })
    // aria-sort sur la seule colonne triée : pas de « non trié » partout.
    expect(entete).not.toHaveAttribute("aria-sort")
    expect(
      screen.getByRole("columnheader", { name: "Ville" })
    ).not.toHaveAttribute("aria-sort")
    // Une colonne non triable n'a pas de bouton.
    expect(screen.queryByRole("button", { name: "Ville" })).toBeNull()
    // Rien n'est annoncé au premier rendu.
    expect(annonceTableau()).toHaveTextContent("")

    await user.click(screen.getByRole("button", { name: "Nom" }))
    expect(entete).toHaveAttribute("aria-sort", "ascending")
    // Le focus reste sur le bouton : le nouveau tri est dit par la zone
    // annoncée du tableau.
    expect(annonceTableau()).toHaveTextContent("Trié par Nom, ordre croissant.")
    expect(nomsAffiches()).toEqual([
      "Ada",
      "Alan",
      "Barbara",
      "Edsger",
      "Grace",
    ])

    await user.click(screen.getByRole("button", { name: "Nom" }))
    expect(entete).toHaveAttribute("aria-sort", "descending")
    expect(annonceTableau()).toHaveTextContent(
      "Trié par Nom, ordre décroissant."
    )
    expect(nomsAffiches()).toEqual([
      "Grace",
      "Edsger",
      "Barbara",
      "Alan",
      "Ada",
    ])

    // Pas de troisième état : le tri ne se retire pas.
    await user.click(screen.getByRole("button", { name: "Nom" }))
    expect(entete).toHaveAttribute("aria-sort", "ascending")
  })

  it("laisse l'ordre au serveur en tri manuel, et signale le tri contrôlé", async () => {
    const user = userEvent.setup()
    const onTriChange = vi.fn()
    function Controle() {
      const [tri, setTri] = useState<SortingState>([{ id: "nom", desc: false }])
      return (
        <Tableau
          tri={tri}
          triManuel
          onTriChange={(maj) => {
            onTriChange(maj)
            setTri(maj)
          }}
        />
      )
    }
    render(<Controle />)
    expect(screen.getByRole("columnheader", { name: /Nom/ })).toHaveAttribute(
      "aria-sort",
      "ascending"
    )
    // Données affichées telles quelles : c'est le serveur qui trie.
    expect(nomsAffiches()).toEqual(PERSONNES.map((p) => p.nom))

    await user.click(screen.getByRole("button", { name: "Nom" }))
    expect(onTriChange).toHaveBeenCalled()
    expect(screen.getByRole("columnheader", { name: /Nom/ })).toHaveAttribute(
      "aria-sort",
      "descending"
    )
  })

  it("sélectionne une plage avec Maj+clic", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Grace" })
    )
    await user.keyboard("{Shift>}")
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Barbara" })
    )
    await user.keyboard("{/Shift}")
    // Edsger (4) n'est pas sélectionnable : la plage le saute.
    expect(selection()).toEqual(["2", "3", "5"])
    expect(
      screen.getByRole("checkbox", { name: "Sélectionner Alan" })
    ).toBeChecked()
    expect(screen.getByRole("row", { name: /Alan/ })).toHaveAttribute(
      "data-state",
      "selected"
    )

    // Maj+clic sur une case cochée désélectionne la plage.
    await user.keyboard("{Shift>}")
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Grace" })
    )
    await user.keyboard("{/Shift}")
    expect(selection()).toEqual([])
  })

  it("coche toutes les lignes sélectionnables depuis l'en-tête", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    const tout = screen.getByRole("checkbox", { name: "Sélectionner la page" })
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    expect(tout).toHaveAttribute("aria-checked", "mixed")

    await user.click(tout)
    expect(selection()).toEqual(["1", "2", "3", "5"])
    expect(tout).toBeChecked()

    await user.click(tout)
    expect(selection()).toEqual([])
  })

  it("explique pourquoi une ligne n'est pas sélectionnable, en un seul arrêt clavier", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    const caseProtegee = screen.getByRole("checkbox", {
      name: "Sélectionner Edsger",
    })
    expect(caseProtegee).toHaveAttribute("aria-disabled", "true")
    expect(caseProtegee).toHaveAccessibleDescription("Ce compte est protégé.")

    // Depuis la case d'Alan, Tab arrive sur la case d'Edsger elle-même
    // (pas sur une enveloppe), puis sur celle de Barbara.
    screen.getByRole("checkbox", { name: "Sélectionner Alan" }).focus()
    await user.tab()
    expect(document.activeElement).toBe(caseProtegee)
    await user.tab()
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: "Sélectionner Barbara" })
    )

    // Ni le clic ni Espace ne la cochent.
    await user.click(caseProtegee)
    caseProtegee.focus()
    await user.keyboard(" ")
    expect(caseProtegee).not.toBeChecked()
    expect(selection()).toEqual([])
  })

  it("réduit la sélection aux lignes encore affichées", async () => {
    const user = userEvent.setup()
    function Pages() {
      const [donnees, setDonnees] = useState(PERSONNES)
      return (
        <>
          <button type="button" onClick={() => setDonnees(PERSONNES.slice(2))}>
            Page suivante
          </button>
          <Tableau donnees={donnees} />
        </>
      )
    }
    render(<Pages />)
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Alan" })
    )
    await user.click(screen.getByRole("button", { name: "Page suivante" }))
    expect(selection()).toEqual(["3"])
  })

  it("ouvre une ligne au clic, sauf sur ses commandes", async () => {
    const user = userEvent.setup()
    const onActiverLigne = vi.fn()
    const ouvrir = vi.fn()
    const colonnes = [
      ...COLONNES,
      aide.display({
        id: "actions",
        cell: () => (
          <DataTableRowActions libelle="Actions">
            <DropdownMenuItem onClick={ouvrir}>Ouvrir</DropdownMenuItem>
          </DataTableRowActions>
        ),
      }),
    ] as DataTableColumnDef<Personne>[]
    render(<Tableau colonnes={colonnes} onActiverLigne={onActiverLigne} />)

    await user.click(screen.getByRole("cell", { name: "Paris" }))
    expect(onActiverLigne).toHaveBeenCalledWith(PERSONNES[1])

    onActiverLigne.mockClear()
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    const ligneAda = screen.getByRole("row", { name: /Ada/ })
    await user.click(within(ligneAda).getByRole("button", { name: "Actions" }))
    await user.click(await screen.findByRole("menuitem", { name: "Ouvrir" }))
    expect(ouvrir).toHaveBeenCalled()
    expect(onActiverLigne).not.toHaveBeenCalled()
  })

  it("laisse à tout élément interactif ou focalisable le clic sur une ligne", async () => {
    const user = userEvent.setup()
    const onActiverLigne = vi.fn()
    const colonnes = [
      ...COLONNES,
      aide.display({
        id: "commandes",
        cell: () => (
          <>
            <span role="switch" aria-checked="false" aria-label="Actif" />
            <span role="combobox" aria-label="Rôle" aria-expanded="false" />
            <span role="tab" aria-label="Onglet" />
            <span tabIndex={0}>
              <span>Focalisable</span>
            </span>
          </>
        ),
      }),
    ] as DataTableColumnDef<Personne>[]
    render(
      <div tabIndex={-1}>
        <Tableau colonnes={colonnes} onActiverLigne={onActiverLigne} />
      </div>
    )
    const ligne = screen.getByRole("row", { name: /Grace/ })
    for (const element of [
      within(ligne).getByRole("switch"),
      within(ligne).getByRole("combobox"),
      within(ligne).getByRole("tab"),
      within(ligne).getByText("Focalisable"),
    ])
      await user.click(element)
    // Case non sélectionnable (ligne protégée).
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Edsger" })
    )
    expect(onActiverLigne).not.toHaveBeenCalled()

    // Le conteneur focalisable du tableau n'empêche pas d'ouvrir la ligne.
    await user.click(within(ligne).getByRole("cell", { name: "Paris" }))
    expect(onActiverLigne).toHaveBeenCalledWith(PERSONNES[1])
  })

  it("ne signale pas une sélection inchangée quand les données sont rechargées", async () => {
    const user = userEvent.setup()
    const onSelectionChange = vi.fn()
    function Controlee({ donnees }: { donnees: Personne[] }) {
      const [selection, setSelection] = useState({})
      return (
        <Tableau
          donnees={donnees}
          selection={selection}
          onSelectionChange={(maj) => {
            setSelection(maj)
            onSelectionChange(maj)
          }}
        />
      )
    }
    const { rerender } = render(<Controlee donnees={PERSONNES} />)
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    expect(onSelectionChange).toHaveBeenCalledTimes(1)

    // Même contenu, nouvelle référence (requête rechargée).
    rerender(<Controlee donnees={[...PERSONNES]} />)
    expect(onSelectionChange).toHaveBeenCalledTimes(1)
    expect(selection()).toEqual(["1"])
  })

  it("affiche l'état vide et les lignes fantômes du chargement", () => {
    const { rerender } = render(<Tableau donnees={[]} />)
    expect(
      screen.getByRole("cell", { name: "Aucun résultat." })
    ).toHaveAttribute("colspan", "3")

    rerender(<Tableau donnees={[]} enChargement />)
    expect(screen.getByRole("table")).toHaveAttribute("aria-busy", "true")
    expect(screen.queryByText("Aucun résultat.")).toBeNull()
    // Autant de lignes fantômes qu'une page de 10, muettes : la zone
    // annoncée dit « Chargement… » au lieu de lignes de cellules vides.
    const fantomes = document.querySelectorAll(
      '[data-slot="data-table-skeleton"]'
    )
    expect(fantomes).toHaveLength(10)
    expect(fantomes[0]).toHaveAttribute("aria-hidden", "true")
    expect(screen.getAllByRole("row")).toHaveLength(1)
    expect(annonceTableau()).toHaveTextContent("Chargement…")
  })

  // Le défilement lui-même (débordement, mobile) se vérifie au navigateur :
  // jsdom ne calcule pas la mise en page. Ici, seulement les classes qui le
  // permettent.
  it("pose les classes du défilement horizontal (cadre défilant, cellules sur une ligne)", () => {
    render(<Tableau />)
    const cadre = document.querySelector('[data-slot="table-container"]')
    expect(cadre).toHaveClass("overflow-x-auto")
    expect(screen.getAllByRole("cell")[1]).toHaveClass("whitespace-nowrap")
  })

  it("ne redessine que la ligne cochée, et ne rappelle pas idLigne", async () => {
    const user = userEvent.setup()
    const rendus = vi.fn()
    const idLigne = vi.fn((p: Personne) => p.id)
    function Nom({ nom }: { nom: string }) {
      rendus(nom)
      return <>{nom}</>
    }
    const colonnes = aide.columns([
      dataTableSelectionColumn<Personne>({
        libelleLigne: (p) => `Sélectionner ${p.nom}`,
      }),
      aide.accessor("nom", {
        header: "Nom",
        cell: ({ row }) => <Nom nom={row.original.nom} />,
      }),
    ])
    function Parent() {
      const [compteur, setCompteur] = useState(0)
      return (
        <>
          <button type="button" onClick={() => setCompteur(compteur + 1)}>
            Rendu du parent
          </button>
          {/* `idLigne` et `onActiverLigne` écrits en ligne, comme souvent. */}
          <Tableau
            colonnes={colonnes}
            idLigne={(p) => idLigne(p)}
            onActiverLigne={() => {}}
          />
        </>
      )
    }
    render(<Parent />)
    rendus.mockClear()
    idLigne.mockClear()

    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    expect(rendus.mock.calls).toEqual([["Ada"]])

    rendus.mockClear()
    await user.click(screen.getByRole("button", { name: "Rendu du parent" }))
    expect(rendus).not.toHaveBeenCalled()
    expect(idLigne).not.toHaveBeenCalled()
  })
})

const DETAIL_COLONNES = aide.columns([
  dataTableSelectionColumn<Personne>({
    libelleLigne: (p) => `Sélectionner ${p.nom}`,
  }),
  dataTableExpandColumn<Personne>({
    libelleLigne: (p) => `Détail de ${p.nom}`,
  }),
  aide.accessor("nom", { header: "Nom" }),
  aide.accessor("ville", { header: "Ville" }),
])

const detail = (p: Personne) => <p>{`${p.nom} habite ${p.ville}.`}</p>

describe("DataTable, lignes dépliables", () => {
  it("déplie une ligne par son bouton, au clavier, avec aria-expanded et aria-controls", async () => {
    const user = userEvent.setup()
    render(<Tableau colonnes={DETAIL_COLONNES} rendreDetail={detail} />)
    const bouton = screen.getByRole("button", { name: "Détail de Grace" })
    expect(bouton).toHaveAttribute("aria-expanded", "false")
    expect(bouton).not.toHaveAttribute("aria-controls")
    expect(screen.queryByText("Grace habite Paris.")).toBeNull()

    bouton.focus()
    await user.keyboard("{Enter}")
    expect(bouton).toHaveAttribute("aria-expanded", "true")
    const contenu = screen.getByText("Grace habite Paris.")
    const cellule = contenu.closest("td")!
    expect(bouton).toHaveAttribute("aria-controls", cellule.id)
    // Toute la largeur : une cellule sur toutes les colonnes visibles.
    expect(cellule).toHaveAttribute("colspan", "4")
    // Juste sous sa ligne.
    const lignes = screen.getAllByRole("row")
    const rang = lignes.indexOf(bouton.closest("tr")!)
    expect(lignes[rang + 1]).toContainElement(contenu)
    expect(document.activeElement).toBe(bouton)

    await user.keyboard(" ")
    expect(bouton).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Grace habite Paris.")).toBeNull()
  })

  it("déplie au clic sur la ligne sans onActiverLigne, sans gêner la sélection", async () => {
    const user = userEvent.setup()
    render(<Tableau colonnes={DETAIL_COLONNES} rendreDetail={detail} />)
    await user.click(screen.getByRole("cell", { name: "Ada" }))
    expect(screen.getByText("Ada habite Lyon.")).toBeInTheDocument()

    // Cocher une case ne déplie ni ne replie rien.
    await user.click(screen.getByRole("checkbox", { name: "Sélectionner Ada" }))
    expect(selection()).toEqual(["1"])
    expect(screen.getByText("Ada habite Lyon.")).toBeInTheDocument()
    expect(
      screen.getByRole("cell", { name: "Ada" }).closest("tr")
    ).toHaveAttribute("data-state", "selected")
  })

  it("laisse le clic de ligne à onActiverLigne quand il est fourni", async () => {
    const user = userEvent.setup()
    const onActiverLigne = vi.fn()
    render(
      <Tableau
        colonnes={DETAIL_COLONNES}
        rendreDetail={detail}
        onActiverLigne={onActiverLigne}
      />
    )
    await user.click(screen.getByRole("cell", { name: "Paris" }))
    expect(onActiverLigne).toHaveBeenCalledWith(PERSONNES[1])
    expect(screen.queryByText("Grace habite Paris.")).toBeNull()

    // Le bouton déplie sans activer la ligne.
    await user.click(screen.getByRole("button", { name: "Détail de Grace" }))
    expect(screen.getByText("Grace habite Paris.")).toBeInTheDocument()
    expect(onActiverLigne).toHaveBeenCalledTimes(1)
  })

  it("une seule ligne dépliée à la fois, et pas de bouton pour une ligne non dépliable", async () => {
    const user = userEvent.setup()
    render(
      <Tableau
        colonnes={DETAIL_COLONNES}
        rendreDetail={detail}
        uneSeuleLigneDepliee
        ligneDepliable={(p) => p.id !== "3"}
      />
    )
    expect(screen.queryByRole("button", { name: "Détail de Alan" })).toBeNull()
    await user.click(screen.getByRole("button", { name: "Détail de Ada" }))
    await user.click(screen.getByRole("button", { name: "Détail de Grace" }))
    expect(screen.queryByText("Ada habite Lyon.")).toBeNull()
    expect(screen.getByText("Grace habite Paris.")).toBeInTheDocument()
  })

  it("garde le détail ouvert quand les données sont rechargées, le referme si la ligne disparaît", async () => {
    const user = userEvent.setup()
    const onLignesDeplieesChange = vi.fn()
    function Rechargee({ donnees }: { donnees: Personne[] }) {
      const [depliees, setDepliees] = useState({})
      return (
        <Tableau
          donnees={donnees}
          colonnes={DETAIL_COLONNES}
          rendreDetail={detail}
          lignesDepliees={depliees}
          onLignesDeplieesChange={(maj) => {
            setDepliees(maj)
            onLignesDeplieesChange(maj)
          }}
        />
      )
    }
    const { rerender } = render(<Rechargee donnees={PERSONNES} />)
    await user.click(screen.getByRole("button", { name: "Détail de Grace" }))
    expect(onLignesDeplieesChange).toHaveBeenLastCalledWith({ "2": true })

    rerender(<Rechargee donnees={[...PERSONNES]} />)
    expect(screen.getByText("Grace habite Paris.")).toBeInTheDocument()

    rerender(<Rechargee donnees={PERSONNES.filter((p) => p.id !== "2")} />)
    expect(onLignesDeplieesChange).toHaveBeenLastCalledWith({})
    expect(screen.queryByText(/habite/)).toBeNull()
  })

  it("garde repliée une entrée false restante quand des lignes disparaissent", () => {
    const onLignesDeplieesChange = vi.fn()
    function Controlee({ donnees }: { donnees: Personne[] }) {
      const [depliees, setDepliees] = useState<Record<string, boolean>>({
        "1": true,
        "3": false,
      })
      return (
        <Tableau
          donnees={donnees}
          colonnes={DETAIL_COLONNES}
          rendreDetail={detail}
          lignesDepliees={depliees}
          onLignesDeplieesChange={(maj) => {
            setDepliees(maj)
            onLignesDeplieesChange(maj)
          }}
        />
      )
    }
    const { rerender } = render(<Controlee donnees={PERSONNES} />)
    rerender(<Controlee donnees={PERSONNES.slice(2)} />)
    expect(onLignesDeplieesChange).toHaveBeenLastCalledWith({ "3": false })
    expect(
      screen.getByRole("button", { name: "Détail de Alan" })
    ).toHaveAttribute("aria-expanded", "false")
    expect(screen.queryByText("Alan habite Rennes.")).toBeNull()
  })
})
