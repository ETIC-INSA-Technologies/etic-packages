// Pagination, filtre et tri côté client de `useDataTable`, et retrait d'une
// partie de la sélection (`deselectionner`).
import { act, render, screen, within } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { useState } from "react"
import { functionalUpdate } from "@tanstack/react-table"
import { describe, expect, it, vi } from "vitest"

import {
  Button,
  DataTable,
  DataTableColumnHeader,
  DataTablePagination,
  DataTableToolbar,
  createDataTableColumnHelper,
  dataTableSelectionColumn,
  useDataTable,
  type DataTableInstance,
  type UseDataTableOptions,
} from "@etic-ui/index"

interface Poste {
  id: string
  nom: string
  pole: string
}

const POLES = ["Études", "DSI", "Trésorerie"]
// 30 postes : « Poste 1 » à « Poste 30 », répartis sur trois pôles.
const POSTES: Poste[] = Array.from({ length: 30 }, (_, i) => ({
  id: String(i + 1),
  nom: `Poste ${i + 1}`,
  pole: POLES[i % 3],
}))

const aide = createDataTableColumnHelper<Poste>()
const COLONNES = aide.columns([
  dataTableSelectionColumn<Poste>({
    libelleLigne: (p) => `Sélectionner ${p.nom}`,
  }),
  aide.accessor("nom", {
    header: ({ column }) => (
      <DataTableColumnHeader column={column} libelle="Nom" />
    ),
    sortFn: "texteFr",
    meta: { libelle: "Nom" },
  }),
  aide.accessor("pole", { header: "Pôle", filterFn: "equalsString" }),
])

function Liste({
  donnees = POSTES,
  surTable,
  ...options
}: Partial<UseDataTableOptions<Poste>> & {
  surTable?: (table: DataTableInstance<Poste>) => void
}) {
  const [recherche, setRecherche] = useState("")
  const table = useDataTable({
    donnees,
    colonnes: COLONNES,
    idLigne: (p) => p.id,
    paginationClient: true,
    filtreGlobal: recherche,
    onFiltreGlobalChange: setRecherche,
    ...options,
  })
  surTable?.(table)
  return (
    <>
      <DataTableToolbar
        recherche={{ valeur: recherche, onValeurChange: setRecherche }}
        compteur={{ table, unite: { singulier: "poste", pluriel: "postes" } }}
      />
      <Button onClick={() => table.getColumn("pole")?.setFilterValue("DSI")}>
        Pôle DSI
      </Button>
      <Button onClick={() => table.options.meta?.deselectionner(["1", "3"])}>
        Retirer 1 et 3
      </Button>
      <output data-testid="selection">
        {table.getSelectedRowIds().sort().join(",")}
      </output>
      <DataTable table={table} libelle="Postes" />
      <DataTablePagination table={table} />
    </>
  )
}

const nomsAffiches = () =>
  screen
    .getAllByRole("row")
    .slice(1)
    .map((ligne) => within(ligne).getAllByRole("cell")[1].textContent)

const compteur = () =>
  document.querySelector('[data-slot="data-table-count"]')?.textContent

describe("useDataTable côté client", () => {
  it("découpe les données en pages de 25, pilotées par DataTablePagination", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    expect(nomsAffiches()).toHaveLength(25)
    expect(compteur()).toBe("30 postes · 1–25 affichés")

    await user.click(screen.getByRole("button", { name: "Page 2" }))
    expect(nomsAffiches()).toEqual([
      "Poste 26",
      "Poste 27",
      "Poste 28",
      "Poste 29",
      "Poste 30",
    ])
    expect(compteur()).toBe("30 postes · 26–30 affichés")
  })

  it("part de la taille de page donnée", () => {
    render(<Liste etatInitial={{ pagination: { pageSize: 10 } }} />)
    expect(nomsAffiches()).toHaveLength(10)
    expect(screen.getByRole("button", { name: "Page 3" })).toBeInTheDocument()
  })

  it("recherche sans casse ni accents, et revient à la première page", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    await user.click(screen.getByRole("button", { name: "Page 2" }))

    // « tresorerie » trouve « Trésorerie » : dix postes, une seule page.
    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher" }),
      "tresorerie"
    )
    expect(nomsAffiches()).toHaveLength(10)
    expect(nomsAffiches()[0]).toBe("Poste 3")
    expect(compteur()).toBe("10 postes · 1–10 affichés")
    expect(screen.queryByRole("button", { name: "Page 2" })).toBeNull()
  })

  it("filtre une colonne par sa fonction", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    await user.click(screen.getByRole("button", { name: "Pôle DSI" }))
    expect(nomsAffiches()).toHaveLength(10)
    expect(nomsAffiches()[0]).toBe("Poste 2")
  })

  it("trie par ordre alphabétique français : « Poste 2 » avant « Poste 10 »", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    await user.click(screen.getByRole("button", { name: "Page 2" }))
    await user.click(screen.getByRole("button", { name: "Nom" }))
    // Le tri ramène aussi à la première page.
    expect(nomsAffiches().slice(0, 3)).toEqual([
      "Poste 1",
      "Poste 2",
      "Poste 3",
    ])
    await user.click(screen.getByRole("button", { name: "Nom" }))
    expect(nomsAffiches().slice(0, 2)).toEqual(["Poste 30", "Poste 29"])
  })

  it("trie les accents à leur place : « Élève » entre « Directeur » et « Fondateur »", async () => {
    const user = userEvent.setup()
    const donnees = ["Fondateur", "élève", "Directeur", "Zélateur"].map(
      (nom, i) => ({ id: String(i), nom, pole: "DSI" })
    )
    render(<Liste donnees={donnees} />)
    await user.click(screen.getByRole("button", { name: "Nom" }))
    // Le tri de TanStack par défaut (codes de caractères) mettrait « élève »
    // après « Zélateur ».
    expect(nomsAffiches()).toEqual([
      "Directeur",
      "élève",
      "Fondateur",
      "Zélateur",
    ])
  })

  it("reste sur la page courante quand une ligne est supprimée", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Liste />)
    await user.click(screen.getByRole("button", { name: "Page 2" }))
    rerender(<Liste donnees={POSTES.filter((p) => p.id !== "27")} />)
    expect(nomsAffiches()).toEqual([
      "Poste 26",
      "Poste 28",
      "Poste 29",
      "Poste 30",
    ])
  })

  it("ramène sur la dernière page quand la page courante disparaît", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Liste />)
    await user.click(screen.getByRole("button", { name: "Page 2" }))
    rerender(<Liste donnees={POSTES.slice(0, 25)} />)
    expect(nomsAffiches()).toHaveLength(25)
    expect(nomsAffiches()[0]).toBe("Poste 1")

    // Même quand la pagination ne s'affiche plus (tout tient sur une page).
    rerender(<Liste donnees={POSTES} />)
    await user.click(screen.getByRole("button", { name: "Page 2" }))
    rerender(<Liste donnees={POSTES.slice(0, 5)} />)
    expect(nomsAffiches()).toEqual([
      "Poste 1",
      "Poste 2",
      "Poste 3",
      "Poste 4",
      "Poste 5",
    ])
  })

  it("réduit la sélection aux lignes de la page affichée", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    await user.click(
      screen.getByRole("checkbox", { name: "Sélectionner Poste 1" })
    )
    await user.click(screen.getByRole("button", { name: "Page 2" }))
    expect(screen.getByTestId("selection")).toHaveTextContent("")
  })

  it("sans paginationClient, affiche toutes les lignes, sans pagination trompeuse", () => {
    const avertir = vi.spyOn(console, "warn").mockImplementation(() => {})
    render(<Liste paginationClient={false} />)
    expect(nomsAffiches()).toHaveLength(30)
    // `DataTablePagination table={…}` ne paginerait rien : rien n'est
    // affiché, et le développeur est prévenu.
    expect(screen.queryByRole("navigation")).toBeNull()
    expect(avertir).toHaveBeenCalledTimes(1)
    avertir.mockRestore()
  })

  it("relit les textes quand les données changent (cache de la recherche)", async () => {
    const user = userEvent.setup()
    const { rerender } = render(<Liste />)
    await user.type(
      screen.getByRole("searchbox", { name: "Rechercher" }),
      "poste 1"
    )
    expect(nomsAffiches()).toContain("Poste 1")
    // Mêmes identifiants, autres textes : la recherche suit les nouveaux.
    rerender(
      <Liste donnees={POSTES.map((p) => ({ ...p, nom: `Rôle ${p.id}` }))} />
    )
    expect(screen.queryAllByRole("row")).toHaveLength(2)
    expect(screen.getByText("Aucun résultat.")).toBeInTheDocument()
  })
})

describe("deselectionner", () => {
  it("retire des lignes de la sélection et garde les autres", async () => {
    const user = userEvent.setup()
    render(<Liste />)
    for (const n of [1, 2, 3])
      await user.click(
        screen.getByRole("checkbox", { name: `Sélectionner Poste ${n}` })
      )
    expect(screen.getByTestId("selection")).toHaveTextContent("1,2,3")

    await user.click(screen.getByRole("button", { name: "Retirer 1 et 3" }))
    expect(screen.getByTestId("selection")).toHaveTextContent(/^2$/)
  })

  it("met fin à « tous sélectionnés »", () => {
    let table: DataTableInstance<Poste> | undefined
    function Avec() {
      const [tout, setTout] = useState(false)
      return (
        <>
          <output data-testid="tout">{String(tout)}</output>
          <Liste
            paginationClient={false}
            donnees={POSTES.slice(0, 3)}
            total={40}
            toutSelectionne={tout}
            onToutSelectionneChange={setTout}
            surTable={(t) => {
              table = t
            }}
          />
        </>
      )
    }
    render(<Avec />)
    act(() => table!.options.meta!.changerToutSelectionne(true))
    expect(screen.getByTestId("tout")).toHaveTextContent("true")
    act(() => table!.options.meta!.deselectionner(["2"]))
    expect(screen.getByTestId("tout")).toHaveTextContent("false")
    expect(screen.getByTestId("selection")).toHaveTextContent("1,3")
  })
})

describe("pagination et filtres côté client : cas limites", () => {
  /** Tableau minimal, piloté par ses props (`colonnes`, filtres, page). */
  function Simple({
    colonnes = COLONNES,
    surTable,
    ...options
  }: Partial<UseDataTableOptions<Poste>> & {
    surTable?: (table: DataTableInstance<Poste>) => void
  }) {
    const table = useDataTable({
      donnees: POSTES,
      colonnes,
      idLigne: (p) => p.id,
      paginationClient: true,
      ...options,
    })
    surTable?.(table)
    return (
      <>
        <DataTable table={table} libelle="Postes" />
        <DataTablePagination table={table} />
      </>
    )
  }

  it("garde une page initiale tant que les données ne sont pas arrivées", () => {
    const initial = { pagination: { pageIndex: 2, pageSize: 5 } }
    const { rerender } = render(<Simple donnees={[]} etatInitial={initial} />)
    rerender(<Simple donnees={POSTES} etatInitial={initial} />)
    // Page 3 (index 2) : postes 11 à 15, pas un retour en page 1.
    expect(nomsAffiches()[0]).toBe("Poste 11")
  })

  it("ne revient pas en page 1 pour des filtres recréés à l'identique", async () => {
    const user = userEvent.setup()
    const filtres = () => [{ id: "pole", value: "Études" }]
    const initial = { pagination: { pageSize: 5 } }
    const { rerender } = render(
      <Simple filtresColonnes={filtres()} etatInitial={initial} />
    )
    await user.click(screen.getByRole("button", { name: "Page 2" }))
    expect(nomsAffiches()[0]).toBe("Poste 16")
    // Nouveau tableau, même contenu (filtre écrit en ligne par la page).
    rerender(<Simple filtresColonnes={filtres()} etatInitial={initial} />)
    expect(nomsAffiches()[0]).toBe("Poste 16")
    // Un autre contenu, lui, ramène en page 1.
    rerender(
      <Simple
        filtresColonnes={[{ id: "pole", value: "DSI" }]}
        etatInitial={initial}
      />
    )
    expect(nomsAffiches()[0]).toBe("Poste 2")
  })

  it("relit les textes quand les colonnes changent, données identiques", () => {
    // TanStack ne relit pas lui-même les valeurs d'une ligne tant que les
    // données ne changent pas : on appelle la fonction de filtre avec une
    // ligne dont l'accesseur change, comme après un changement de colonnes.
    let table: DataTableInstance<Poste> | undefined
    render(
      <Simple
        colonnes={aide.columns([
          aide.accessor("nom", { header: "Nom", filterFn: "texteFr" }),
        ])}
        surTable={(t) => {
          table = t
        }}
      />
    )
    const fn = table!.getColumn("nom")!.getFilterFn()!
    const donnees = [{}]
    const ligne = (colonnes: object, valeur: string) =>
      ({
        id: "1",
        getValue: () => valeur,
        table: { options: { data: donnees, columns: colonnes } },
      }) as unknown as Parameters<typeof fn>[0]
    const cherche = fn.resolveFilterValue?.("tresorerie")
    expect(fn(ligne([], "Poste 1"), "nom", cherche)).toBe(false)
    // Mêmes données, autres définitions de colonnes : autre valeur lue.
    expect(fn(ligne([], "Trésorerie"), "nom", cherche)).toBe(true)
  })

  it("texteFr : une recherche vide laisse passer toute ligne, cellule vide comprise", () => {
    interface Fiche {
      id: string
      nom: string | null
    }
    const aideFiche = createDataTableColumnHelper<Fiche>()
    const colonnes = aideFiche.columns([
      aideFiche.accessor("nom", { header: "Nom", filterFn: "texteFr" }),
    ])
    function Fiches({
      filtre,
      surTable,
    }: {
      filtre?: string
      surTable: (t: DataTableInstance<Fiche>) => void
    }) {
      const table = useDataTable({
        donnees: FICHES,
        colonnes,
        idLigne: (f) => f.id,
        filtresColonnes:
          filtre === undefined ? [] : [{ id: "nom", value: filtre }],
        filtreGlobal: " ",
      })
      surTable(table)
      return <DataTable table={table} libelle="Fiches" />
    }
    const FICHES: Fiche[] = [
      { id: "1", nom: "Ada" },
      { id: "2", nom: null },
    ]
    let table: DataTableInstance<Fiche> | undefined
    render(
      <Fiches
        filtre=""
        surTable={(t) => {
          table = t
        }}
      />
    )
    expect(screen.getAllByRole("row")).toHaveLength(3)

    // Appel direct de la fonction, avec la valeur qu'elle résout elle-même :
    // une recherche « » ne filtre rien, même une cellule nulle.
    const fn = table!.getColumn("nom")!.getFilterFn()!
    const ligneNulle = table!.getRow("2")
    for (const recherche of [" ", ""])
      expect(
        fn(ligneNulle, "nom", fn.resolveFilterValue?.(recherche) ?? recherche)
      ).toBe(true)
  })

  it("change la taille de page en une seule mise à jour (pagination contrôlée)", async () => {
    const user = userEvent.setup()
    function Controlee() {
      const [pagination, setPagination] = useState({
        pageIndex: 1,
        pageSize: 10,
      })
      return (
        <Simple
          pagination={pagination}
          // Résolu contre la valeur rendue, comme une page qui garde sa
          // pagination dans l'URL : deux mises à jour successives se
          // contrediraient.
          onPaginationChange={(maj) =>
            setPagination(functionalUpdate(maj, pagination))
          }
        />
      )
    }
    render(<Controlee />)
    expect(nomsAffiches()[0]).toBe("Poste 11")
    await user.click(screen.getByRole("combobox", { name: "Lignes par page" }))
    await user.click(await screen.findByRole("option", { name: "25" }))
    expect(nomsAffiches()).toHaveLength(25)
    expect(nomsAffiches()[0]).toBe("Poste 1")
  })
})
