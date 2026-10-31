import { act, fireEvent, render, screen } from "@testing-library/react"
import userEvent from "@testing-library/user-event"
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest"

import {
  DataTable,
  DataTableViewOptions,
  createDataTableColumnHelper,
  dataTableSelectionColumn,
  useDataTable,
} from "@etic-ui/index"

interface Ligne {
  id: string
  nom: string
  ville: string
  pole: string
}

const aide = createDataTableColumnHelper<Ligne>()
const COLONNES = aide.columns([
  dataTableSelectionColumn<Ligne>(),
  aide.accessor("nom", { header: "Nom" }),
  aide.accessor("ville", { header: "Ville" }),
  aide.accessor("pole", { header: () => "Pôle", meta: { libelle: "Pôle" } }),
])
const DONNEES: Ligne[] = [{ id: "1", nom: "Ada", ville: "Lyon", pole: "DSI" }]

function Tableau() {
  const table = useDataTable({
    donnees: DONNEES,
    colonnes: COLONNES,
    idLigne: (l) => l.id,
  })
  return (
    <>
      <button type="button">Ailleurs</button>
      <DataTableViewOptions table={table} />
      <DataTable table={table} libelle="Personnes" />
    </>
  )
}

const entetes = () =>
  screen.getAllByRole("columnheader").map((th) => th.textContent)

/** dnd-kit n'écoute le clavier qu'au tour suivant le début du glisser. */
const attendre = () => act(() => new Promise<void>((fin) => setTimeout(fin, 0)))

// jsdom ne mesure rien : chaque élément de la liste reçoit une boîte selon
// son rang, pour que les flèches de dnd-kit trouvent la colonne voisine.
beforeEach(() => {
  vi.spyOn(Element.prototype, "getBoundingClientRect").mockImplementation(
    function (this: Element) {
      const li = this.closest("li")
      const rang = li ? [...li.parentElement!.children].indexOf(li) : 0
      // Le décalage de dnd-kit (translate3d) compte, comme dans un navigateur.
      const decalage = /translate3d\([^,]+,\s*(-?[\d.]+)px/.exec(
        li?.style.transform ?? ""
      )
      const top = rang * 32 + Number(decalage?.[1] ?? 0)
      return {
        x: 0,
        y: top,
        top,
        left: 0,
        width: 200,
        height: 32,
        right: 200,
        bottom: top + 32,
        toJSON: () => ({}),
      } as DOMRect
    }
  )
})
afterEach(() => vi.restoreAllMocks())

describe("DataTableViewOptions", () => {
  it("affiche ou masque les colonnes, sans se refermer", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    await user.click(screen.getByRole("button", { name: "Colonnes" }))

    // La colonne de sélection ne se masque pas : absente du panneau.
    const ville = await screen.findByRole("checkbox", { name: "Ville" })
    expect(screen.getByRole("checkbox", { name: "Pôle" })).toBeChecked()
    expect(screen.getAllByRole("listitem")).toHaveLength(3)

    await user.click(ville)
    expect(ville).not.toBeChecked()
    expect(entetes()).toEqual(["", "Nom", "Pôle"])
    expect(screen.getByRole("dialog")).toBeInTheDocument()

    await user.click(screen.getByRole("checkbox", { name: "Ville" }))
    expect(entetes()).toEqual(["", "Nom", "Ville", "Pôle"])
  })

  it("garde affichée la dernière colonne de données, en disant pourquoi", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    await user.click(screen.getByRole("button", { name: "Colonnes" }))
    await user.click(await screen.findByRole("checkbox", { name: "Ville" }))
    await user.click(screen.getByRole("checkbox", { name: "Pôle" }))
    const nom = screen.getByRole("checkbox", { name: "Nom" })
    expect(nom).toHaveAttribute("aria-disabled", "true")
    expect(nom).toHaveAccessibleDescription(
      "Au moins une colonne reste affichée."
    )
    await user.click(nom)
    expect(nom).toBeChecked()
    expect(entetes()).toEqual(["", "Nom"])
    // Toujours focalisable : la raison reste lisible au clavier.
    expect(document.activeElement).toBe(nom)
  })

  it("compte une colonne de rendu masquable comme colonne de données, pas les actions", async () => {
    const user = userEvent.setup()
    const colonnes = aide.columns([
      dataTableSelectionColumn<Ligne>(),
      aide.accessor("nom", { header: "Nom" }),
      aide.display({
        id: "resume",
        header: "Résumé",
        cell: ({ row }) => `${row.original.nom}, ${row.original.ville}`,
      }),
      aide.display({ id: "actions", enableHiding: false, cell: () => "…" }),
    ])
    function AvecRendu() {
      const table = useDataTable({
        donnees: DONNEES,
        colonnes,
        idLigne: (l) => l.id,
      })
      return (
        <>
          <DataTableViewOptions table={table} />
          <DataTable table={table} libelle="Personnes" />
        </>
      )
    }
    render(<AvecRendu />)
    await user.click(screen.getByRole("button", { name: "Colonnes" }))
    const nom = await screen.findByRole("checkbox", { name: "Nom" })
    // « Résumé » est affiché : « Nom » n'est pas la dernière.
    expect(nom).not.toHaveAttribute("aria-disabled")
    await user.click(nom)
    expect(entetes()).toEqual(["", "Résumé", ""])
    const resume = screen.getByRole("checkbox", { name: "Résumé" })
    expect(resume).toHaveAttribute("aria-disabled", "true")
    await user.click(resume)
    expect(entetes()).toEqual(["", "Résumé", ""])
  })

  it("réordonne les colonnes au clavier, la sélection restant en tête", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    await user.click(screen.getByRole("button", { name: "Colonnes" }))
    const poignee = await screen.findByRole("button", {
      name: "Déplacer la colonne Nom",
    })
    expect(poignee).toHaveAttribute(
      "aria-roledescription",
      "colonne déplaçable"
    )

    poignee.focus()
    fireEvent.keyDown(poignee, { code: "Space", key: " " })
    await attendre()
    fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" })
    await attendre()
    fireEvent.keyDown(document, { code: "Space", key: " " })
    await attendre()

    expect(entetes()).toEqual(["", "Ville", "Nom", "Pôle"])
    expect(screen.getAllByRole("listitem").map((li) => li.textContent)).toEqual(
      ["Ville", "Nom", "Pôle"]
    )
  })

  it("Échap ferme le panneau depuis une poignée, hors glisser", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    const bouton = screen.getByRole("button", { name: "Colonnes" })
    bouton.focus()
    await user.keyboard("{Enter}")
    await screen.findByRole("dialog")
    // Le focus s'ouvre sur la première case, pas sur une poignée.
    expect(document.activeElement).toBe(
      screen.getByRole("checkbox", { name: "Nom" })
    )
    await user.tab({ shift: true })
    expect(document.activeElement).toBe(
      screen.getByRole("button", { name: "Déplacer la colonne Nom" })
    )
    await user.keyboard("{Escape}")
    await attendre()
    expect(bouton).toHaveAttribute("aria-expanded", "false")
    expect(document.activeElement).toBe(bouton)
  })

  it("Échap annule un déplacement sans fermer le panneau, puis le ferme", async () => {
    const user = userEvent.setup()
    render(<Tableau />)
    await user.click(screen.getByRole("button", { name: "Colonnes" }))
    const poignee = await screen.findByRole("button", {
      name: "Déplacer la colonne Nom",
    })
    poignee.focus()
    fireEvent.keyDown(poignee, { code: "Space", key: " " })
    await attendre()
    fireEvent.keyDown(document, { code: "ArrowDown", key: "ArrowDown" })
    await attendre()
    // La poignée a le focus (son infobulle ne s'interpose pas) : Échap y
    // annule le glisser.
    await user.keyboard("{Escape}")
    await attendre()

    expect(entetes()).toEqual(["", "Nom", "Ville", "Pôle"])
    expect(screen.getByRole("button", { name: "Colonnes" })).toHaveAttribute(
      "aria-expanded",
      "true"
    )

    // Le glisser est bien terminé : Échap ferme maintenant le panneau.
    await user.keyboard("{Escape}")
    await attendre()
    expect(screen.getByRole("button", { name: "Colonnes" })).toHaveAttribute(
      "aria-expanded",
      "false"
    )
  })
})
